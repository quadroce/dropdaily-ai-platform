import { db } from "../db";
import { content, InsertContent } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Social Media Content Ingestion Service
 * Handles content from X (Twitter), YouTube, and Reddit
 */

export interface SocialMediaPost {
  id: string;
  title: string;
  description?: string;
  url: string;
  author: string;
  publishedAt: Date;
  platform: 'twitter' | 'youtube' | 'reddit';
  imageUrl?: string;
  thumbnailUrl?: string;
  engagement?: {
    likes?: number;
    shares?: number;
    comments?: number;
    views?: number;
  };
  metadata?: any;
}

export class SocialMediaIngestionService {
  
  /**
   * Ingest content from X (Twitter) tech accounts
   */
  async ingestTwitterContent(): Promise<SocialMediaPost[]> {
    console.log('🐦 Starting Twitter content ingestion...');
    
    // Tech accounts to follow
    const techAccounts = [
      '@elonmusk', '@sundarpichai', '@satyanadella', '@tim_cook',
      '@sama', '@pmarca', '@naval', '@balajis', '@garrytan',
      '@VitalikButerin', '@jack', '@brian_armstrong', '@paulg',
      '@dhh', '@gdb', '@levie', '@jessepollak', '@cdixon'
    ];

    // Mock Twitter content (in production, use Twitter API v2)
    const mockPosts: SocialMediaPost[] = [
      {
        id: 'tweet_1',
        title: 'AI will revolutionize coding in the next 2 years',
        description: 'The rise of AI coding assistants like GitHub Copilot and ChatGPT is just the beginning. Soon we\'ll see AI that can architect entire applications from natural language descriptions.',
        url: 'https://twitter.com/example/status/123456789',
        author: 'Tech Leader',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        platform: 'twitter',
        engagement: {
          likes: 2341,
          shares: 456,
          comments: 123
        },
        metadata: {
          verified: true,
          followers: 150000
        }
      },
      {
        id: 'tweet_2',
        title: 'The future of remote work is hybrid AI collaboration',
        description: 'Remote work tools are evolving beyond video calls. We\'re moving toward AI-powered collaborative workspaces where human creativity meets machine efficiency.',
        url: 'https://twitter.com/example/status/123456790',
        author: 'Remote Work Expert',
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        platform: 'twitter',
        engagement: {
          likes: 1234,
          shares: 234,
          comments: 89
        }
      },
      {
        id: 'tweet_3',
        title: 'Web3 infrastructure is finally maturing',
        description: 'Layer 2 solutions, better UX, and institutional adoption are making Web3 accessible to mainstream users. The next wave of innovation is here.',
        url: 'https://twitter.com/example/status/123456791',
        author: 'Crypto Builder',
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        platform: 'twitter',
        engagement: {
          likes: 892,
          shares: 178,
          comments: 67
        }
      }
    ];

    console.log(`✅ Fetched ${mockPosts.length} Twitter posts`);
    return mockPosts;
  }

  /**
   * Ingest content from YouTube tech channels
   */
  async ingestYouTubeContent(): Promise<SocialMediaPost[]> {
    console.log('📺 Starting YouTube content ingestion...');
    
    // Tech channels to follow
    const techChannels = [
      'TechCrunch', 'The Verge', 'Marques Brownlee', 'Linus Tech Tips',
      'Two Minute Papers', 'Computerphile', 'Y Combinator', 'Google Developers',
      'Microsoft Developer', 'AWS Events', 'Fireship', 'Web Dev Simplified'
    ];

    // Mock YouTube content (in production, use YouTube Data API v3)
    const mockVideos: SocialMediaPost[] = [
      {
        id: 'video_1',
        title: 'The Complete Guide to React Server Components in 2025',
        description: 'Learn everything about React Server Components, their benefits, and how to implement them in your Next.js applications. Includes practical examples and performance comparisons.',
        url: 'https://youtube.com/watch?v=example1',
        author: 'React Experts',
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        platform: 'youtube',
        thumbnailUrl: 'https://img.youtube.com/vi/example1/maxresdefault.jpg',
        engagement: {
          views: 45234,
          likes: 2890,
          comments: 234
        },
        metadata: {
          duration: 1248, // 20:48
          channel: 'React Experts',
          subscribers: 250000
        }
      },
      {
        id: 'video_2',
        title: 'Building Scalable APIs with Node.js and TypeScript',
        description: 'Comprehensive tutorial on building production-ready APIs using Node.js, TypeScript, and modern best practices. Covers authentication, validation, error handling, and deployment.',
        url: 'https://youtube.com/watch?v=example2',
        author: 'Backend Masters',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        platform: 'youtube',
        thumbnailUrl: 'https://img.youtube.com/vi/example2/maxresdefault.jpg',
        engagement: {
          views: 32156,
          likes: 1987,
          comments: 145
        },
        metadata: {
          duration: 2156, // 35:56
          channel: 'Backend Masters',
          subscribers: 180000
        }
      },
      {
        id: 'video_3',
        title: 'AI Code Generation: GitHub Copilot vs ChatGPT vs Claude',
        description: 'Detailed comparison of AI coding assistants in 2025. Real-world testing with complex programming tasks to see which AI performs best for different scenarios.',
        url: 'https://youtube.com/watch?v=example3',
        author: 'AI Code Review',
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        platform: 'youtube',
        thumbnailUrl: 'https://img.youtube.com/vi/example3/maxresdefault.jpg',
        engagement: {
          views: 78923,
          likes: 4521,
          comments: 567
        },
        metadata: {
          duration: 1789, // 29:49
          channel: 'AI Code Review',
          subscribers: 420000
        }
      }
    ];

    console.log(`✅ Fetched ${mockVideos.length} YouTube videos`);
    return mockVideos;
  }

  /**
   * Ingest content from Reddit tech communities
   */
  async ingestRedditContent(): Promise<SocialMediaPost[]> {
    console.log('🔴 Starting Reddit content ingestion...');
    
    // Tech subreddits to follow
    const techSubreddits = [
      'r/programming', 'r/webdev', 'r/MachineLearning', 'r/artificial',
      'r/technology', 'r/startups', 'r/entrepreneurs', 'r/reactjs',
      'r/node', 'r/docker', 'r/kubernetes', 'r/devops', 'r/coding',
      'r/cscareerquestions', 'r/javascript', 'r/Python'
    ];

    // Mock Reddit content (in production, use Reddit API)
    const mockPosts: SocialMediaPost[] = [
      {
        id: 'reddit_1',
        title: 'I built a SaaS in 30 days using AI tools - here\'s what I learned',
        description: 'My journey building a complete SaaS application using ChatGPT, GitHub Copilot, and Cursor IDE. Revenue, challenges, and lessons learned from AI-assisted development.',
        url: 'https://reddit.com/r/entrepreneurs/comments/example1',
        author: 'indie_dev_2025',
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        platform: 'reddit',
        engagement: {
          likes: 1247, // upvotes
          comments: 89
        },
        metadata: {
          subreddit: 'r/entrepreneurs',
          flair: 'Lessons Learned',
          awards: 3
        }
      },
      {
        id: 'reddit_2',
        title: 'Senior developers: what are the most important skills for 2025?',
        description: 'Looking for advice on which technologies and skills to prioritize. AI/ML integration, cloud architecture, or something else? Share your thoughts.',
        url: 'https://reddit.com/r/cscareerquestions/comments/example2',
        author: 'career_seeker_25',
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        platform: 'reddit',
        engagement: {
          likes: 456,
          comments: 134
        },
        metadata: {
          subreddit: 'r/cscareerquestions',
          flair: 'Career Question'
        }
      },
      {
        id: 'reddit_3',
        title: 'New JavaScript framework benchmarks - performance comparison 2025',
        description: 'Comprehensive performance testing of React, Vue, Svelte, and Solid.js. Bundle sizes, rendering speed, and memory usage analyzed.',
        url: 'https://reddit.com/r/javascript/comments/example3',
        author: 'perf_tester',
        publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
        platform: 'reddit',
        engagement: {
          likes: 892,
          comments: 67
        },
        metadata: {
          subreddit: 'r/javascript',
          flair: 'Benchmarks'
        }
      }
    ];

    console.log(`✅ Fetched ${mockPosts.length} Reddit posts`);
    return mockPosts;
  }

  /**
   * Process and store social media content
   */
  async processSocialMediaContent(posts: SocialMediaPost[]): Promise<number> {
    let processedCount = 0;

    for (const post of posts) {
      try {
        // Check for duplicates
        const existing = await db
          .select()
          .from(content)
          .where(eq(content.url, post.url))
          .limit(1);

        if (existing.length > 0) {
          console.log(`⏭️ Skipping duplicate: ${post.title}`);
          continue;
        }

        // Store content
        const contentData: InsertContent = {
          title: post.title,
          description: post.description,
          url: post.url,
          source: post.platform,
          contentType: post.platform === 'youtube' ? 'video' : 'article',
          status: 'approved',
          publishedAt: post.publishedAt,
          author: post.author,
          imageUrl: post.imageUrl,
          thumbnailUrl: post.thumbnailUrl,
          metadata: {
            ...post.metadata,
            engagement: post.engagement,
            platform: post.platform,
            originalId: post.id
          }
        };

        await db.insert(content).values(contentData);
        processedCount++;
        console.log(`✅ Stored ${post.platform} content: ${post.title}`);

      } catch (error) {
        console.error(`❌ Failed to process ${post.platform} content: ${post.title}`, error);
      }
    }

    return processedCount;
  }

  /**
   * Run complete social media ingestion
   */
  async runSocialMediaIngestion(): Promise<{
    twitter: number;
    youtube: number;
    reddit: number;
    total: number;
  }> {
    console.log('🚀 Starting complete social media ingestion...');

    const [twitterPosts, youtubePosts, redditPosts] = await Promise.all([
      this.ingestTwitterContent(),
      this.ingestYouTubeContent(),
      this.ingestRedditContent()
    ]);

    const [twitterCount, youtubeCount, redditCount] = await Promise.all([
      this.processSocialMediaContent(twitterPosts),
      this.processSocialMediaContent(youtubePosts),
      this.processSocialMediaContent(redditPosts)
    ]);

    const total = twitterCount + youtubeCount + redditCount;
    
    console.log(`🎉 Social media ingestion complete: ${total} new items`);
    console.log(`  📱 Twitter: ${twitterCount} posts`);
    console.log(`  📺 YouTube: ${youtubeCount} videos`);
    console.log(`  🔴 Reddit: ${redditCount} posts`);

    return {
      twitter: twitterCount,
      youtube: youtubeCount,
      reddit: redditCount,
      total
    };
  }
}

export const socialMediaIngestionService = new SocialMediaIngestionService();