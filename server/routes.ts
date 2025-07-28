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

  const httpServer = createServer(app);
  return httpServer;
}
