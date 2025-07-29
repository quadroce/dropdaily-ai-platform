import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertUserSubmissionSchema, content, contentTopics, topics } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { initializeTopics, ingestYouTubeContent, processUserSubmission, generateDailyDropsForUser } from "./services/contentIngestion";
import bcrypt from "bcrypt";

export async function registerRoutes(app: Express): Promise<Server> {
  // Root health endpoint for deployment (only in production)
  if (process.env.NODE_ENV === "production") {
    app.get("/", (req, res) => {
      try {
        res.status(200).json({ 
          status: "healthy", 
          timestamp: new Date().toISOString(),
          service: "DropDaily API",
          version: "1.0.0",
          uptime: process.uptime(),
          env: "production"
        });
      } catch (error) {
        res.status(200).json({ status: "healthy" });
      }
    });
  }

  // Additional health endpoints for deployment compatibility
  app.get("/healthz", (req, res) => {
    res.status(200).send("OK");
  });

  app.get("/ready", (req, res) => {
    res.status(200).json({ ready: true });
  });

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });

      // Don't return password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Don't return password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Topics routes
  app.get("/api/topics", async (req, res) => {
    try {
      const topics = await storage.getAllTopics();
      res.json(topics);
    } catch (error) {
      console.error("Failed to get topics:", error);
      res.status(500).json({ message: "Failed to fetch topics" });
    }
  });

  // User preferences routes
  app.get("/api/users/:userId/preferences", async (req, res) => {
    try {
      const { userId } = req.params;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Failed to get user preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.post("/api/users/:userId/preferences", async (req, res) => {
    try {
      const { userId } = req.params;
      const { topicIds } = req.body;
      
      if (!Array.isArray(topicIds)) {
        return res.status(400).json({ message: "topicIds must be an array" });
      }

      await storage.setUserPreferences(userId, topicIds);
      
      // Mark user as onboarded
      await storage.updateUser(userId, { isOnboarded: true });
      
      // Generate initial daily drops
      await generateDailyDropsForUser(userId);
      
      res.json({ message: "Preferences saved successfully" });
    } catch (error) {
      console.error("Failed to save preferences:", error);
      res.status(500).json({ message: "Failed to save preferences" });
    }
  });

  // Content routes
  app.get("/api/content", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;

      let content;
      if (search) {
        content = await storage.searchContent(search);
      } else {
        content = await storage.getAllContent(limit, offset);
      }
      
      res.json(content);
    } catch (error) {
      console.error("Failed to get content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.get("/api/content/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const content = await storage.getContentById(id);
      
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      res.json(content);
    } catch (error) {
      console.error("Failed to get content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  // Daily drops routes
  app.get("/api/users/:userId/daily-drops", async (req, res) => {
    try {
      const { userId } = req.params;
      const date = req.query.date as string;
      
      const drops = await storage.getUserDailyDrops(userId, date);
      res.json(drops);
    } catch (error) {
      console.error("Failed to get daily drops:", error);
      res.status(500).json({ message: "Failed to fetch daily drops" });
    }
  });

  app.post("/api/users/:userId/daily-drops/:contentId/view", async (req, res) => {
    try {
      const { userId, contentId } = req.params;
      await storage.markDropAsViewed(userId, contentId);
      res.json({ message: "Marked as viewed" });
    } catch (error) {
      console.error("Failed to mark as viewed:", error);
      res.status(500).json({ message: "Failed to mark as viewed" });
    }
  });

  app.post("/api/users/:userId/daily-drops/:contentId/bookmark", async (req, res) => {
    try {
      const { userId, contentId } = req.params;
      await storage.toggleBookmark(userId, contentId);
      res.json({ message: "Bookmark toggled" });
    } catch (error) {
      console.error("Failed to toggle bookmark:", error);
      res.status(500).json({ message: "Failed to toggle bookmark" });
    }
  });

  // User submissions routes
  app.get("/api/users/:userId/submissions", async (req, res) => {
    try {
      const { userId } = req.params;
      const submissions = await storage.getUserSubmissions(userId);
      res.json(submissions);
    } catch (error) {
      console.error("Failed to get user submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.post("/api/users/:userId/submissions", async (req, res) => {
    try {
      const { userId } = req.params;
      const validatedData = insertUserSubmissionSchema.parse({
        ...req.body,
        userId
      });
      
      const submission = await storage.createUserSubmission(validatedData);
      res.status(201).json(submission);
    } catch (error) {
      console.error("Failed to create submission:", error);
      res.status(400).json({ message: "Invalid submission data" });
    }
  });

  // Admin routes
  app.get("/api/admin/submissions", async (req, res) => {
    try {
      const status = req.query.status as string;
      const submissions = await storage.getAllSubmissions(status);
      res.json(submissions);
    } catch (error) {
      console.error("Failed to get submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.patch("/api/admin/submissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, moderatedBy, moderationNotes } = req.body;
      
      const submission = await storage.updateSubmissionStatus(id, status, moderatedBy, moderationNotes);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // If approved, process the submission
      if (status === 'approved') {
        await processUserSubmission(id);
      }
      
      res.json(submission);
    } catch (error) {
      console.error("Failed to update submission:", error);
      res.status(500).json({ message: "Failed to update submission" });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get system stats:", error);
      res.status(500).json({ message: "Failed to fetch system stats" });
    }
  });

  // Content ingestion routes (for admin/development)
  app.post("/api/admin/ingest/youtube", async (req, res) => {
    try {
      await ingestYouTubeContent();
      res.json({ message: "YouTube ingestion started" });
    } catch (error) {
      console.error("Failed to start YouTube ingestion:", error);
      res.status(500).json({ message: "Failed to start ingestion" });
    }
  });

  // Social Media Ingestion Routes
  app.post("/api/admin/ingest/social-media", async (req, res) => {
    try {
      const { socialMediaIngestionService } = await import("./services/social-media-ingestion");
      const results = await socialMediaIngestionService.runSocialMediaIngestion();
      
      res.json({ 
        success: true,
        message: `Social media ingestion completed: ${results.total} new items`,
        results
      });
    } catch (error) {
      console.error("Social media ingestion failed:", error);
      res.status(500).json({ 
        error: "Social media ingestion failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.post("/api/admin/ingest/twitter", async (req, res) => {
    try {
      const { socialMediaIngestionService } = await import("./services/social-media-ingestion");
      const posts = await socialMediaIngestionService.ingestTwitterContent();
      const processed = await socialMediaIngestionService.processSocialMediaContent(posts);
      
      res.json({ 
        success: true,
        message: `Twitter ingestion completed: ${processed} new posts`,
        processed
      });
    } catch (error) {
      console.error("Twitter ingestion failed:", error);
      res.status(500).json({ 
        error: "Twitter ingestion failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.post("/api/admin/ingest/reddit", async (req, res) => {
    try {
      const { socialMediaIngestionService } = await import("./services/social-media-ingestion");
      const posts = await socialMediaIngestionService.ingestRedditContent();
      const processed = await socialMediaIngestionService.processSocialMediaContent(posts);
      
      res.json({ 
        success: true,
        message: `Reddit ingestion completed: ${processed} new posts`,
        processed
      });
    } catch (error) {
      console.error("Reddit ingestion failed:", error);
      res.status(500).json({ 
        error: "Reddit ingestion failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.post("/api/admin/generate-drops/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      await generateDailyDropsForUser(userId);
      res.json({ message: "Daily drops generated" });
    } catch (error) {
      console.error("Failed to generate daily drops:", error);
      res.status(500).json({ message: "Failed to generate daily drops" });
    }
  });

  // RSS Ingestion routes
  app.post("/api/admin/rss/ingest", async (req, res) => {
    try {
      const { ingestionService } = await import("./services/ingestion");
      await ingestionService.runDailyIngestion();
      res.json({ success: true, message: "RSS ingestion completed successfully" });
    } catch (error) {
      console.error("RSS ingestion failed:", error);
      res.status(500).json({ 
        error: "RSS ingestion failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.post("/api/admin/rss/daily-drops", async (req, res) => {
    try {
      const { dailyDropService } = await import("./services/daily-drop");
      await dailyDropService.generateAndSendDailyDrops();
      res.json({ success: true, message: "Daily drops generated and sent successfully" });
    } catch (error) {
      console.error("Daily drops generation failed:", error);
      res.status(500).json({ 
        error: "Daily drops generation failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.get("/api/admin/rss/stats", async (req, res) => {
    try {
      const { ingestionService } = await import("./services/ingestion");
      const stats = await ingestionService.getIngestionStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get RSS ingestion stats:", error);
      res.status(500).json({ error: "Failed to get statistics" });
    }
  });

  app.get("/api/admin/rss/feeds", async (req, res) => {
    try {
      const { feedsLoader } = await import("./lib/feeds-loader");
      const feeds = feedsLoader.getFeeds();
      res.json(feeds);
    } catch (error) {
      console.error("Failed to get feeds:", error);
      res.status(500).json({ error: "Failed to get feeds configuration" });
    }
  });

  // Load feeds from JSON to database
  app.post("/api/admin/rss/load-feeds", async (req, res) => {
    try {
      const { feedsLoader } = await import("./lib/feeds-loader");
      feedsLoader.loadFeeds(); // Load from JSON
      await feedsLoader.saveFeeds(); // Save to database
      
      const feeds = feedsLoader.getFeeds();
      res.json({ 
        success: true, 
        message: `Loaded ${feeds.length} feeds to database`,
        feeds 
      });
    } catch (error) {
      console.error("Failed to load feeds to database:", error);
      res.status(500).json({ 
        error: "Failed to load feeds to database",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Content Cleanup Routes
  app.get("/api/admin/content/storage-stats", async (req, res) => {
    try {
      const { contentCleanup } = await import("./services/content-cleanup");
      const stats = await contentCleanup.getStorageStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get storage stats:", error);
      res.status(500).json({ 
        error: "Failed to get storage statistics", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.post("/api/admin/content/cleanup", async (req, res) => {
    try {
      const { contentCleanup } = await import("./services/content-cleanup");
      const result = await contentCleanup.cleanupOldContent();
      res.json({
        success: true,
        message: `Cleanup completed: ${result.deletedCount} articles removed`,
        ...result
      });
    } catch (error) {
      console.error("Content cleanup failed:", error);
      res.status(500).json({ 
        error: "Content cleanup failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.post("/api/admin/content/schedule-cleanup", async (req, res) => {
    try {
      const { contentCleanup } = await import("./services/content-cleanup");
      await contentCleanup.scheduleCleanup();
      res.json({
        success: true,
        message: "Scheduled cleanup completed successfully"
      });
    } catch (error) {
      console.error("Scheduled cleanup failed:", error);
      res.status(500).json({ 
        error: "Scheduled cleanup failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Classify all unclassified content with intelligent fallback
  app.post("/api/admin/rss/classify-all", async (req, res) => {
    try {
      console.log("🎯 Starting automatic classification of unclassified content...");
      
      // Import database and schemas dynamically 
      const { db } = await import("./db");
      const { content, contentTopics, topics } = await import("@shared/schema");
      const { eq, and, sql } = await import("drizzle-orm");
      
      // Find content without topic classifications
      const unclassifiedContent = await db
        .select({
          id: content.id,
          title: content.title,
          description: content.description,
          url: content.url,
          publishedAt: content.publishedAt,
        })
        .from(content)
        .leftJoin(contentTopics, eq(content.id, contentTopics.contentId))
        .where(and(
          eq(content.status, 'approved'),
          sql`${contentTopics.contentId} IS NULL`
        ));

      console.log(`📊 Found ${unclassifiedContent.length} articles without classifications`);

      let classified = 0;
      const processingStartTime = Date.now();

      for (const article of unclassifiedContent) {
        try {
          // Smart keyword-based classification
          const fallbackTopics = [];
          const text = (article.title + ' ' + (article.description || '')).toLowerCase();
          
          // AI/ML Detection - highest priority for tech content
          if (text.includes('ai') || text.includes('artificial intelligence') || text.includes('machine learning') || 
              text.includes('openai') || text.includes('chatgpt') || text.includes('neural network') ||
              text.includes('deep learning') || text.includes('gpt') || text.includes('llm') ||
              text.includes('claude') || text.includes('gemini') || text.includes('anthropic')) {
            fallbackTopics.push({ name: 'AI/ML', confidence: 0.85 });
          }
          
          // Engineering Detection
          if (text.includes('engineer') || text.includes('developer') || text.includes('programming') || 
              text.includes('software') || text.includes('code') || text.includes('api') ||
              text.includes('framework') || text.includes('library') || text.includes('github') ||
              text.includes('tech') || text.includes('javascript') || text.includes('python')) {
            fallbackTopics.push({ name: 'Engineering', confidence: 0.8 });
          }
          
          // Business & Startup Detection
          if (text.includes('business') || text.includes('startup') || text.includes('company') || 
              text.includes('entrepreneur') || text.includes('funding') || text.includes('revenue') ||
              text.includes('market') || text.includes('strategy') || text.includes('ceo') ||
              text.includes('investment') || text.includes('vc') || text.includes('venture')) {
            fallbackTopics.push({ name: 'Business', confidence: 0.75 });
          }
          
          // Product Management Detection
          if (text.includes('product') || text.includes('launch') || text.includes('feature') ||
              text.includes('roadmap') || text.includes('release') || text.includes('user experience') ||
              text.includes('pm') || text.includes('product manager')) {
            fallbackTopics.push({ name: 'Product', confidence: 0.7 });
          }
          
          // Design Detection
          if (text.includes('design') || text.includes('ui') || text.includes('ux') ||
              text.includes('interface') || text.includes('visual') || text.includes('branding') ||
              text.includes('figma') || text.includes('designer')) {
            fallbackTopics.push({ name: 'Design', confidence: 0.7 });
          }
          
          // Data Science Detection
          if (text.includes('data') || text.includes('analytics') || text.includes('science') ||
              text.includes('analysis') || text.includes('metrics') || text.includes('statistics') ||
              text.includes('visualization') || text.includes('dataset')) {
            fallbackTopics.push({ name: 'Data Science', confidence: 0.75 });
          }
          
          // DevOps Detection
          if (text.includes('devops') || text.includes('deployment') || text.includes('cloud') ||
              text.includes('docker') || text.includes('kubernetes') || text.includes('infrastructure') ||
              text.includes('aws') || text.includes('azure') || text.includes('server')) {
            fallbackTopics.push({ name: 'DevOps', confidence: 0.75 });
          }
          
          // Security Detection
          if (text.includes('security') || text.includes('privacy') || text.includes('breach') ||
              text.includes('vulnerability') || text.includes('encryption') || text.includes('hack') ||
              text.includes('cyber') || text.includes('malware')) {
            fallbackTopics.push({ name: 'Security', confidence: 0.8 });
          }
          
          // Leadership Detection
          if (text.includes('leadership') || text.includes('management') || text.includes('team') ||
              text.includes('culture') || text.includes('hiring') || text.includes('remote work') ||
              text.includes('manager') || text.includes('lead')) {
            fallbackTopics.push({ name: 'Leadership', confidence: 0.7 });
          }
          
          // Remove duplicates and sort by confidence
          const uniqueTopics = fallbackTopics
            .filter((topic, index, self) => index === self.findIndex(t => t.name === topic.name))
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 3); // Max 3 topics per article
          
          // Fallback to Business if no specific matches
          if (uniqueTopics.length === 0) {
            uniqueTopics.push({ name: 'Business', confidence: 0.5 });
          }
          
          // Save classifications to database
          for (const topic of uniqueTopics) {
            const dbTopic = await db.select().from(topics).where(eq(topics.name, topic.name)).limit(1);
            if (dbTopic[0]) {
              await db.insert(contentTopics).values({
                contentId: article.id,
                topicId: dbTopic[0].id,
                confidence: topic.confidence,
              });
            }
          }
          
          classified++;
          
          // Progress logging every 50 articles
          if (classified % 50 === 0) {
            const elapsed = ((Date.now() - processingStartTime) / 1000).toFixed(1);
            console.log(`📈 Progress: ${classified}/${unclassifiedContent.length} articles classified (${elapsed}s elapsed)`);
          }
          
        } catch (error) {
          console.error(`❌ Failed to classify article "${article.title}":`, error);
        }
      }

      const totalTime = ((Date.now() - processingStartTime) / 1000).toFixed(1);
      const successRate = unclassifiedContent.length > 0 ? (classified / unclassifiedContent.length * 100).toFixed(1) : '100';
      
      console.log(`🎉 Classification completed: ${classified}/${unclassifiedContent.length} articles (${successRate}%) in ${totalTime}s`);
      
      res.json({
        success: true,
        message: `Successfully classified ${classified} out of ${unclassifiedContent.length} articles using intelligent keyword analysis`,
        data: { 
          totalFound: unclassifiedContent.length, 
          classified,
          successRate: successRate + '%',
          processingTime: totalTime + 's'
        }
      });
    } catch (error) {
      console.error('❌ Auto-classification failed:', error);
      res.status(500).json({ 
        error: "Failed to classify content automatically",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Create admin user endpoint (for development/setup)
  app.post("/api/admin/create-admin", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if admin already exists
      const existingAdmin = await storage.getUserByEmail(email);
      if (existingAdmin) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create admin user
      const adminUser = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "admin",
        isOnboarded: true
      });

      // Don't return password
      const { password: _, ...userWithoutPassword } = adminUser;
      res.status(201).json({ 
        message: "Admin user created successfully",
        user: userWithoutPassword 
      });
    } catch (error) {
      console.error("Failed to create admin user:", error);
      res.status(500).json({ error: "Failed to create admin user" });
    }
  });

  // Test RSS ingestion without OpenAI (fallback mode)
  app.post("/api/admin/ingest/rss-fallback", async (req, res) => {
    try {
      const { limit = 3 } = req.body;
      const { db } = await import("./db");
      const { feeds, content, insertContentSchema } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const Parser = (await import("rss-parser")).default;
      
      console.log('🔄 Starting RSS ingestion (fallback mode)...');
      
      // Get active feeds from database
      const activeFeeds = await db
        .select()
        .from(feeds)
        .where(eq(feeds.isActive, true));
      
      console.log(`📡 Found ${activeFeeds.length} active feeds`);
      
      if (activeFeeds.length === 0) {
        return res.json({ success: false, message: "No active feeds found" });
      }
      
      const parser = new Parser();
      let totalIngested = 0;
      const results = [];
      
      for (const feed of activeFeeds.slice(0, 2)) { // Limit to 2 feeds
        try {
          console.log(`📥 Fetching feed: ${feed.name}`);
          const feedData = await parser.parseURL(feed.url);
          
          for (const item of feedData.items.slice(0, limit)) {
            try {
              // Check if content already exists
              const existingContent = await db
                .select()
                .from(content)
                .where(eq(content.url, item.link || ''))
                .limit(1);
              
              if (existingContent.length > 0) {
                console.log(`⏭️ Content already exists: ${item.title}`);
                continue;
              }
              
              // Create content without AI classification
              const contentData = insertContentSchema.parse({
                title: item.title || 'Untitled',
                description: item.contentSnippet || item.summary || '',
                url: item.link || '',
                source: feed.name,
                contentType: 'article',
                author: item.creator || item.author || null,
                publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
                embedding: null, // Will be generated later
                status: 'pending' // Set to pending until AI processing
              });
              
              await db.insert(content).values(contentData);
              totalIngested++;
              console.log(`✅ Ingested: ${item.title}`);
              
            } catch (itemError) {
              console.error(`❌ Failed to ingest item from ${feed.name}:`, itemError);
            }
          }
          
          results.push({
            feedName: feed.name,
            itemsProcessed: Math.min(limit, feedData.items.length)
          });
          
        } catch (feedError) {
          console.error(`❌ Failed to fetch feed ${feed.name}:`, feedError);
          results.push({
            feedName: feed.name,
            error: feedError instanceof Error ? feedError.message : 'Unknown error'
          });
        }
      }
      
      console.log(`🎉 Ingestion complete: ${totalIngested} items ingested`);
      
      res.json({ 
        success: true, 
        message: `Ingested ${totalIngested} items in fallback mode (no AI classification)`,
        totalIngested,
        results,
        note: "Content ingested without AI classification due to OpenAI quota limits"
      });
      
    } catch (error) {
      console.error("RSS fallback ingestion failed:", error);
      res.status(500).json({ 
        error: "RSS fallback ingestion failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
