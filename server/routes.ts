import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertUserSubmissionSchema } from "@shared/schema";
import { initializeTopics, ingestYouTubeContent, processUserSubmission, generateDailyDropsForUser } from "./services/contentIngestion";
import bcrypt from "bcrypt";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize topics on startup
  await initializeTopics();

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
        error: "Failed to load feeds", 
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
