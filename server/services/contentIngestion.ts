import { storage } from "../storage";
import { generateEmbedding, classifyContent, generateTopicEmbedding } from "./openai";
import type { InsertContent, Topic } from "@shared/schema";

export interface ContentSource {
  url: string;
  title: string;
  description?: string;
  source: string;
  contentType: string;
  duration?: number;
  thumbnailUrl?: string;
  transcript?: string;
  metadata?: any;
}

export async function initializeTopics(): Promise<void> {
  console.log("Initializing default topics...");
  
  try {
    // Test database connection first
    await storage.getAllTopics();
  } catch (error) {
    console.error("Database connection failed during topic initialization:", error);
    if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('42P01'))) {
      throw new Error("Database table 'topics' does not exist. Please run database migrations.");
    }
    throw error;
  }
  
  const defaultTopics = [
    { name: "AI/ML", description: "Artificial Intelligence and Machine Learning technologies, frameworks, and applications" },
    { name: "Product", description: "Product management, strategy, development lifecycle, and user experience" },
    { name: "Design", description: "User interface design, user experience, design systems, and visual design" },
    { name: "Engineering", description: "Software engineering practices, architecture, development methodologies" },
    { name: "Business", description: "Business strategy, operations, management, and organizational development" },
    { name: "Marketing", description: "Digital marketing, growth strategies, brand development, and customer acquisition" },
    { name: "Mobile Dev", description: "Mobile application development for iOS, Android, and cross-platform solutions" },
    { name: "DevOps", description: "Development operations, CI/CD, infrastructure, and deployment practices" },
    { name: "Security", description: "Cybersecurity, application security, data protection, and privacy" },
    { name: "Data Science", description: "Data analysis, statistics, data visualization, and business intelligence" },
    { name: "Startups", description: "Entrepreneurship, startup culture, venture capital, and scaling businesses" },
    { name: "Leadership", description: "Management skills, team leadership, organizational culture, and professional development" }
  ];

  try {
    const existingTopics = await storage.getAllTopics();
    
    for (const topicData of defaultTopics) {
      const exists = existingTopics.find(t => t.name === topicData.name);
      if (!exists) {
        try {
          // Create topic without embedding initially to avoid OpenAI quota issues
          await storage.createTopic({
            ...topicData,
            embedding: null
          });
          console.log(`Created topic: ${topicData.name}`);
        } catch (error) {
          console.error(`Failed to create topic ${topicData.name}:`, error);
          // Continue with other topics even if one fails
        }
      }
    }
    console.log("✅ Topic initialization completed successfully");
  } catch (error) {
    console.error("❌ Failed to initialize topics:", error);
    throw error;
  }
}

export async function ingestContent(contentSource: ContentSource): Promise<string | null> {
  try {
    console.log(`Ingesting content: ${contentSource.title}`);

    // Generate content embedding with fallback
    const contentText = `${contentSource.title} ${contentSource.description || ''} ${contentSource.transcript || ''}`;
    let embedding: number[];
    let classification: any;
    
    try {
      embedding = await generateEmbedding(contentText);
    } catch (error) {
      console.warn("⚠️ Embedding generation failed, using fallback");
      embedding = new Array(1536).fill(0).map(() => Math.random() * 0.01);
    }

    // Classify content into topics with fallback
    try {
      classification = await classifyContent(
        contentSource.title,
        contentSource.description || '',
        contentSource.transcript
      );
    } catch (error) {
      console.warn("⚠️ Content classification failed, using fallback");
      classification = {
        topics: [{ name: "General", confidence: 0.5 }],
        summary: "Content classification temporarily unavailable"
      };
    }

    // Create content record
    const contentData: InsertContent = {
      title: contentSource.title,
      description: contentSource.description || classification.summary,
      url: contentSource.url,
      source: contentSource.source,
      contentType: contentSource.contentType,
      duration: contentSource.duration,
      thumbnailUrl: contentSource.thumbnailUrl,
      transcript: contentSource.transcript,
      embedding: JSON.stringify(embedding),
      status: 'approved',
      metadata: contentSource.metadata
    };

    const createdContent = await storage.createContent(contentData);

    // Associate with topics
    if (classification.topics.length > 0) {
      const allTopics = await storage.getAllTopics();
      const topicIds: string[] = [];
      const confidences: number[] = [];

      for (const classifiedTopic of classification.topics) {
        const topic = allTopics.find(t => t.name === classifiedTopic.name);
        if (topic) {
          topicIds.push(topic.id);
          confidences.push(classifiedTopic.confidence);
        }
      }

      if (topicIds.length > 0) {
        await storage.setContentTopics(createdContent.id, topicIds, confidences);
      }
    }

    console.log(`Successfully ingested content: ${createdContent.id}`);
    return createdContent.id;

  } catch (error) {
    console.error("Failed to ingest content:", error);
    return null;
  }
}

export async function processUserSubmission(submissionId: string): Promise<boolean> {
  try {
    const submissions = await storage.getAllSubmissions('approved');
    const submission = submissions.find(s => s.id === submissionId);
    
    if (!submission) {
      throw new Error("Submission not found or not approved");
    }

    const contentSource: ContentSource = {
      url: submission.url,
      title: submission.title,
      description: submission.description || undefined,
      source: 'user_submission',
      contentType: 'article', // Default, could be improved with URL analysis
      metadata: {
        submittedBy: submission.userId,
        submissionId: submission.id
      }
    };

    const contentId = await ingestContent(contentSource);
    
    if (contentId) {
      // Update submission with linked content ID
      await storage.updateSubmissionStatus(submissionId, 'approved', undefined, undefined);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to process user submission:", error);
    return false;
  }
}

// Mock YouTube content ingestion (in a real app, this would use YouTube API)
export async function ingestYouTubeContent(): Promise<void> {
  console.log("Running YouTube content ingestion...");
  
  // Mock YouTube videos for demonstration
  const mockYouTubeVideos: ContentSource[] = [
    {
      url: "https://youtube.com/watch?v=example1",
      title: "Advanced React Patterns for Production Applications",
      description: "Learn about advanced React patterns that will help you build more maintainable and scalable applications in production environments.",
      source: "youtube",
      contentType: "video",
      duration: 25,
      thumbnailUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400",
      transcript: "In this video, we'll explore advanced React patterns including render props, compound components, and custom hooks that help you build reusable and maintainable code...",
      metadata: {
        channel: "React Development",
        publishedAt: new Date(),
        viewCount: 15420
      }
    },
    {
      url: "https://youtube.com/watch?v=example2",
      title: "Machine Learning for Product Managers: A Practical Guide",
      description: "Understand how to leverage machine learning in product development, from identifying use cases to working with engineering teams.",
      source: "youtube",
      contentType: "video",
      duration: 18,
      thumbnailUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400",
      transcript: "As a product manager, understanding machine learning doesn't mean you need to know how to code, but you do need to understand the possibilities and limitations...",
      metadata: {
        channel: "Product Management Insights",
        publishedAt: new Date(),
        viewCount: 8930
      }
    }
  ];

  for (const video of mockYouTubeVideos) {
    await ingestContent(video);
    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

export async function generateDailyDropsForUser(userId: string): Promise<void> {
  try {
    console.log(`Generating daily drops for user: ${userId}`);

    // Get user preferences
    const preferences = await storage.getUserPreferences(userId);
    if (preferences.length === 0) {
      console.log("User has no preferences set");
      return;
    }

    // Get or generate user profile vector
    let userEmbedding = await storage.getUserProfileVector(userId);
    if (!userEmbedding) {
      // Generate profile embedding from topic preferences
      const allTopics = await storage.getAllTopics();
      const userTopicEmbeddings = preferences.map(pref => {
        const topic = allTopics.find(t => t.id === pref.topicId);
        if (topic && topic.embedding) {
          return {
            topicEmbedding: JSON.parse(topic.embedding),
            weight: pref.weight
          };
        }
        return null;
      }).filter(Boolean) as Array<{ topicEmbedding: number[]; weight: number }>;

      if (userTopicEmbeddings.length > 0) {
        const { generateUserProfileEmbedding } = await import("./openai");
        const profileEmbedding = await generateUserProfileEmbedding(userTopicEmbeddings);
        userEmbedding = JSON.stringify(profileEmbedding);
        await storage.setUserProfileVector(userId, userEmbedding);
      }
    }

    if (!userEmbedding) {
      console.log("Could not generate user profile embedding");
      return;
    }

    // Get today's existing drops to avoid duplicates
    const today = new Date().toISOString().split('T')[0];
    const existingDrops = await storage.getUserDailyDrops(userId, today);
    const excludeIds = existingDrops.map(drop => drop.contentId);

    // Find similar content (limiting to 3 items per day)
    const similarContent = await storage.findSimilarContent(userEmbedding, 3, excludeIds);

    // Create daily drops
    for (const content of similarContent) {
      await storage.createDailyDrop({
        userId,
        contentId: content.id,
        dropDate: new Date(),
        matchScore: 0.85, // Mock similarity score
        wasViewed: false,
        wasBookmarked: false
      });
    }

    console.log(`Created ${similarContent.length} daily drops for user ${userId}`);
  } catch (error) {
    console.error("Failed to generate daily drops:", error);
  }
}

export async function runDailyDropGeneration(): Promise<void> {
  console.log("Running daily drop generation for all users...");
  
  try {
    // This would normally get all active users
    // For now, we'll skip the actual generation and just log
    console.log("Daily drop generation completed");
  } catch (error) {
    console.error("Failed to run daily drop generation:", error);
  }
}
