import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";

import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import {
  insertUserSchema,
  insertUserSubmissionSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@shared/schema";

// ------ helpers -------------------------------------------------------------

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );

async function resolveTopicIdFromSlug(slug: string): Promise<string | null> {
  const r = await db.execute(
    sql`select id::text as id from public.topics where slug = ${slug} limit 1`
  );
  const rows = r as unknown as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}

// ------ main ---------------------------------------------------------------

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth --------------------------------------------------------------------
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validated = insertUserSchema.parse(req.body);

      const existing = await storage.getUserByEmail(validated.email);
      if (existing) return res.status(400).json({ message: "User already exists" });

      const password = await bcrypt.hash(validated.password, 10);
      const user = await storage.createUser({ ...validated, password });
      const { password: _pw, ...safe } = user;
      res.status(201).json(safe);
    } catch (err) {
      console.error("Registration error:", err);
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ message: "Invalid credentials" });
      const { password: _pw, ...safe } = user;
      res.json(safe);
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Password reset
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const data = requestPasswordResetSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.json({
          message: "Se l'email esiste, riceverai le istruzioni per il reset",
        });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 3600000);
      await storage.createPasswordResetToken(data.email, token, expiresAt);

      const resetLink = `${req.get("host")}/reset-password?token=${token}`;
      console.log(`🔑 Password reset link for ${data.email}: ${resetLink}`);

      res.json({
        message: "Se l'email esiste, riceverai le istruzioni per il reset",
        ...(process.env.NODE_ENV === "development" && { resetToken: token }),
      });
    } catch (err) {
      console.error("Password reset request error:", err);
      res.status(400).json({ message: "Dati non validi" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const data = resetPasswordSchema.parse(req.body);
      const resetToken = await storage.getPasswordResetToken(data.token);
      if (!resetToken) return res.status(400).json({ message: "Token non valido o scaduto" });
      if (new Date() > resetToken.expiresAt)
        return res.status(400).json({ message: "Token scaduto" });

      const user = await storage.getUserByEmail(resetToken.email);
      if (!user) return res.status(404).json({ message: "Utente non trovato" });

      const hashed = await bcrypt.hash(data.newPassword, 10);
      await storage.updateUser(user.id, { password: hashed });
      await storage.markTokenAsUsed(data.token);

      res.json({ message: "Password aggiornata con successo" });
    } catch (err) {
      console.error("Password reset error:", err);
      res.status(400).json({ message: "Errore durante il reset della password" });
    }
  });

  // Topics ------------------------------------------------------------------
  app.get("/api/topics", async (_req, res) => {
    try {
      const topics = await storage.getAllTopics();
      res.json(topics);
    } catch (err) {
      console.error("Failed to get topics:", err);
      res.status(500).json({ message: "Failed to fetch topics" });
    }
  });

  // User Preferences (FIX UUID↔TEXT + topic_id NOT NULL) --------------------

  // GET preferences (cast ::text su entrambe le parti)
  app.get("/api/users/:userId/preferences", async (req, res) => {
    try {
      const userId = String(req.params.userId);
      if (!isUuid(userId)) return res.status(400).json({ message: "Invalid userId" });

      const r = await db.execute(sql`
        select 
          up.user_id::text  as user_id,
          up.topic_id::text as topic_id,
          coalesce(up.weight, 1.0) as weight,
          t.slug,
          t.name
        from public.user_preferences up
        join public.topics t on t.id = up.topic_id
        where up.user_id::text = ${userId}::text
        order by t.name asc
      `);

      res.json(r);
    } catch (err) {
      console.error("Failed to get user preferences:", err);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  // POST/replace preferences for a user
  app.post("/api/users/:userId/preferences", async (req, res) => {
    try {
      const userId = String(req.params.userId);
      if (!isUuid(userId)) return res.status(400).json({ message: "Invalid userId" });

      const bodySchema = z.object({
        preferences: z
          .array(
            z.object({
              topicId: z.string().uuid().optional(),
              topicSlug: z.string().optional(),
              weight: z.number().min(0).max(1).optional(),
            })
          )
          .default([]),
      });

      const { preferences } = bodySchema.parse(req.body);

      // risolviamo sempre un topic_id valido (mai NULL)
      const rowsToInsert: Array<{ topicId: string; weight: number }> = [];
      for (const p of preferences) {
        let topicId = p.topicId ?? null;

        if (!topicId && p.topicSlug) {
          topicId = await resolveTopicIdFromSlug(p.topicSlug);
        }
        if (!topicId) {
          // saltiamo elementi non risolvibili
          continue;
        }
        rowsToInsert.push({ topicId, weight: p.weight ?? 1.0 });
      }

      // transazione "replace": cancelliamo e reinseriamo
      await db.execute(
        sql`delete from public.user_preferences where user_id::text = ${userId}::text`
      );

      for (const row of rowsToInsert) {
        await db.execute(sql`
          insert into public.user_preferences (user_id, topic_id, weight)
          values (${userId}::uuid, ${row.topicId}::uuid, ${row.weight})
        `);
      }

      const saved = await db.execute(sql`
        select 
          up.user_id::text  as user_id,
          up.topic_id::text as topic_id,
          coalesce(up.weight, 1.0) as weight,
          t.slug,
          t.name
        from public.user_preferences up
        join public.topics t on t.id = up.topic_id
        where up.user_id::text = ${userId}::text
        order by t.name asc
      `);

      res.json({ ok: true, count: rowsToInsert.length, preferences: saved });
    } catch (err) {
      console.error("Failed to save preferences:", err);
      res.status(500).json({ message: "Failed to save preferences" });
    }
  });

  // Content -----------------------------------------------------------------
  app.get("/api/content", async (req, res) => {
    try {
      const limit = parseInt((req.query.limit as string) || "50", 10);
      const offset = parseInt((req.query.offset as string) || "0", 10);
      const search = (req.query.search as string) || "";

      const data = search
        ? await storage.searchContent(search)
        : await storage.getAllContent(limit, offset);

      res.json(data);
    } catch (err) {
      console.error("Failed to get content:", err);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.get("/api/content/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.getContentById(id);
      if (!item) return res.status(404).json({ message: "Content not found" });
      res.json(item);
    } catch (err) {
      console.error("Failed to get content:", err);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  // Daily Drops (FIX UUID↔TEXT) ---------------------------------------------

  app.get("/api/users/:userId/daily-drops", async (req, res) => {
    try {
      const userId = String(req.params.userId);
      if (!isUuid(userId)) return res.status(400).json({ message: "Invalid userId" });

      const date = (req.query.date as string) || null;

      const r = await db.execute(sql`
        select 
          dd.content_id::text as content_id,
          dd.user_id::text    as user_id,
          dd.created_at,
          dd.is_viewed,
          c.title, c.description, c.url, c.image_url, c.thumbnail_url, c.source, c.published_at
        from public.daily_drops dd
        join public.content c on c.id::text = dd.content_id::text
        where dd.user_id::text = ${userId}::text
          ${date ? sql`and date(dd.created_at) = ${date}::date` : sql``}
        order by dd.created_at desc
        limit 200
      `);

      res.json(r);
    } catch (err) {
      console.error("Failed to get daily drops:", err);
      res.status(500).json({ message: "Failed to fetch daily drops" });
    }
  });

  app.post("/api/users/:userId/daily-drops/:contentId/view", async (req, res) => {
    try {
      const userId = String(req.params.userId);
      const contentId = String(req.params.contentId);
      if (!isUuid(userId) || !isUuid(contentId))
        return res.status(400).json({ message: "Invalid ids" });

      await db.execute(sql`
        update public.daily_drops
           set is_viewed = true, updated_at = now()
         where user_id::text = ${userId}::text
           and content_id::text = ${contentId}::text
      `);

      res.json({ message: "Marked as viewed" });
    } catch (err) {
      console.error("Failed to mark as viewed:", err);
      res.status(500).json({ message: "Failed to mark as viewed" });
    }
  });

  app.post("/api/users/:userId/daily-drops/:contentId/bookmark", async (req, res) => {
    try {
      const contentId = String(req.params.contentId);
      if (!isUuid(contentId)) return res.status(400).json({ message: "Invalid contentId" });

      const r = await db.execute(sql`
        update public.content
           set is_saved = not coalesce(is_saved, false),
               updated_at = now()
         where id::text = ${contentId}::text
         returning is_saved
      `);
      const rows = r as unknown as Array<{ is_saved: boolean }>;
      res.json({ message: "Bookmark toggled", isSaved: rows[0]?.is_saved ?? null });
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
      res.status(500).json({ message: "Failed to toggle bookmark" });
    }
  });

  // User submissions ---------------------------------------------------------
  app.get("/api/users/:userId/submissions", async (req, res) => {
    try {
      const { userId } = req.params;
      const submissions = await storage.getUserSubmissions(userId);
      res.json(submissions);
    } catch (err) {
      console.error("Failed to get user submissions:", err);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.post("/api/users/:userId/submissions", async (req, res) => {
    try {
      const { userId } = req.params;
      const validated = insertUserSubmissionSchema.parse({ ...req.body, userId });
      const submission = await storage.createUserSubmission(validated);
      res.status(201).json(submission);
    } catch (err) {
      console.error("Failed to create submission:", err);
      res.status(400).json({ message: "Invalid submission data" });
    }
  });

  // Admin / ingestion / utilities -------------------------------------------
  app.get("/api/admin/submissions", async (req, res) => {
    try {
      const status = req.query.status as string;
      const submissions = await storage.getAllSubmissions(status);
      res.json(submissions);
    } catch (err) {
      console.error("Failed to get submissions:", err);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.patch("/api/admin/submissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, moderatedBy, moderationNotes } = req.body;
      const submission = await storage.updateSubmissionStatus(
        id,
        status,
        moderatedBy,
        moderationNotes
      );
      if (!submission) return res.status(404).json({ message: "Submission not found" });

      if (status === "approved") {
        const { processUserSubmission } = await import("./services/contentIngestion");
        await processUserSubmission(id);
      }
      res.json(submission);
    } catch (err) {
      console.error("Failed to update submission:", err);
      res.status(500).json({ message: "Failed to update submission" });
    }
  });

  app.get("/api/admin/stats", async (_req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (err) {
      console.error("Failed to get system stats:", err);
      res.status(500).json({ message: "Failed to fetch system stats" });
    }
  });

  app.post("/api/admin/ingest/youtube", async (_req, res) => {
    try {
      const { ingestYouTubeContent } = await import("./services/contentIngestion");
      await ingestYouTubeContent();
      res.json({ message: "YouTube ingestion completed successfully" });
    } catch (error: any) {
      console.error("Failed to start YouTube ingestion:", error);
      if (error.message?.includes("429") || error.message?.includes("quota")) {
        res.status(200).json({
          message:
            "Ingestion completed with limitations - OpenAI quota exceeded, fallback classification used",
          warning: "Some features may be limited due to API constraints",
        });
      } else {
        res.status(500).json({ message: "Failed to start ingestion: " + error.message });
      }
    }
  });

  app.post("/api/admin/ingest/social-media", async (_req, res) => {
    try {
      const { socialMediaIngestionService } = await import("./services/social-media-ingestion");
      const results = await socialMediaIngestionService.runSocialMediaIngestion();
      res.json({
        success: true,
        message: `Social media ingestion completed: ${results.total} new items`,
        results,
      });
    } catch (err) {
      console.error("Social media ingestion failed:", err);
      res.status(500).json({
        error: "Social media ingestion failed",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.post("/api/admin/ingest/twitter", async (_req, res) => {
    try {
      const { socialMediaIngestionService } = await import("./services/social-media-ingestion");
      const posts = await socialMediaIngestionService.ingestTwitterContent();
      const processed = await socialMediaIngestionService.processSocialMediaContent(posts);
      res.json({
        success: true,
        message: `Twitter ingestion completed: ${processed} new posts`,
        processed,
      });
    } catch (err) {
      console.error("Twitter ingestion failed:", err);
      res.status(500).json({
        error: "Twitter ingestion failed",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.post("/api/admin/ingest/reddit", async (_req, res) => {
    try {
      const { socialMediaIngestionService } = await import("./services/social-media-ingestion");
      const posts = await socialMediaIngestionService.ingestRedditContent();
      const processed = await socialMediaIngestionService.processSocialMediaContent(posts);
      res.json({
        success: true,
        message: `Reddit ingestion completed: ${processed} new posts`,
        processed,
      });
    } catch (err) {
      console.error("Reddit ingestion failed:", err);
      res.status(500).json({
        error: "Reddit ingestion failed",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.post("/api/admin/generate-drops/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { generateDailyDropsForUser } = await import("./services/contentIngestion");
      await generateDailyDropsForUser(userId);
      res.json({ message: "Daily drops generated" });
    } catch (err) {
      console.error("Failed to generate daily drops:", err);
      res.status(500).json({ message: "Failed to generate daily drops" });
    }
  });

  app.post("/api/admin/rss/ingest", async (_req, res) => {
    try {
      const { ingestionService } = await import("./services/ingestion");
      await ingestionService.runDailyIngestion();
      res.json({ success: true, message: "RSS ingestion completed successfully" });
    } catch (err) {
      console.error("RSS ingestion failed:", err);
      res.status(500).json({
        error: "RSS ingestion failed",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.post("/api/admin/rss/daily-drops", async (_req, res) => {
    try {
      const { dailyDropService } = await import("./services/daily-drop");
      await dailyDropService.generateAndSendDailyDrops();
      res.json({ success: true, message: "Daily drops generated and sent successfully" });
    } catch (err) {
      console.error("Daily drops generation failed:", err);
      res.status(500).json({
        error: "Daily drops generation failed",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.get("/api/admin/rss/stats", async (_req, res) => {
    try {
      const { ingestionService } = await import("./services/ingestion");
      const stats = await ingestionService.getIngestionStats();
      res.json(stats);
    } catch (err) {
      console.error("Failed to get RSS ingestion stats:", err);
      res.status(500).json({ error: "Failed to get statistics" });
    }
  });

  app.get("/api/admin/rss/feeds", async (_req, res) => {
    try {
      const { feedsLoader } = await import("./lib/feeds-loader");
      const feeds = feedsLoader.getFeeds();
      res.json(feeds);
    } catch (err) {
      console.error("Failed to get feeds:", err);
      res.status(500).json({ error: "Failed to get feeds configuration" });
    }
  });

  app.post("/api/admin/rss/load-feeds", async (_req, res) => {
    try {
      const { feedsLoader } = await import("./lib/feeds-loader");
      feedsLoader.loadFeeds();
      await feedsLoader.saveFeeds();
      const feeds = feedsLoader.getFeeds();
      res.json({
        success: true,
        message: `Loaded ${feeds.length} feeds to database`,
        feeds,
      });
    } catch (err) {
      console.error("Failed to load feeds to database:", err);
      res.status(500).json({
        error: "Failed to load feeds to database",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // Content cleanup
  app.get("/api/admin/content/storage-stats", async (_req, res) => {
    try {
      const { contentCleanup } = await import("./services/content-cleanup");
      const stats = await contentCleanup.getStorageStats();
      res.json(stats);
    } catch (err) {
      console.error("Failed to get storage stats:", err);
      res.status(500).json({
        error: "Failed to get storage statistics",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.post("/api/admin/content/cleanup", async (_req, res) => {
    try {
      const { contentCleanup } = await import("./services/content-cleanup");
      const result = await contentCleanup.cleanupOldContent();
      res.json({
        success: true,
        message: `Cleanup completed: ${result.deletedCount} articles removed`,
        ...result,
      });
    } catch (err) {
      console.error("Content cleanup failed:", err);
      res.status(500).json({
        error: "Content cleanup failed",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.post("/api/admin/content/schedule-cleanup", async (_req, res) => {
    try {
      const { contentCleanup } = await import("./services/content-cleanup");
      await contentCleanup.scheduleCleanup();
      res.json({ success: true, message: "Scheduled cleanup completed successfully" });
    } catch (err) {
      console.error("Scheduled cleanup failed:", err);
      res.status(500).json({
        error: "Scheduled cleanup failed",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // Classify unclassified content (resto invariato: se serve lo mantieni qui)
  app.post("/api/admin/rss/classify-all", async (_req, res) => {
    try {
      console.log("🎯 Starting automatic classification of unclassified content...");
      const { db } = await import("./db");
      const { content, contentTopics, topics } = await import("@shared/schema");
      const { eq, and, sql } = await import("drizzle-orm");

      const unclassified = await db
        .select({
          id: content.id,
          title: content.title,
          description: content.description,
          url: content.url,
          publishedAt: content.publishedAt,
        })
        .from(content)
        .leftJoin(contentTopics, eq(content.id, contentTopics.contentId))
        .where(and(eq(content.status, "approved"), sql`${contentTopics.contentId} IS NULL`));

      console.log(`📊 Found ${unclassified.length} articles without classifications`);

      let classified = 0;
      for (const article of unclassified) {
        try {
          const text = (
            (article.title || "") + " " + (article.description || "")
          ).toLowerCase();

          const candidates: Array<{ name: string; confidence: number }> = [];
          if (
            text.includes("ai") ||
            text.includes("artificial intelligence") ||
            text.includes("machine learning") ||
            text.includes("openai") ||
            text.includes("chatgpt") ||
            text.includes("neural network") ||
            text.includes("deep learning") ||
            text.includes("gpt") ||
            text.includes("llm") ||
            text.includes("claude") ||
            text.includes("gemini") ||
            text.includes("anthropic")
          )
            candidates.push({ name: "AI/ML", confidence: 0.85 });

          if (
            text.includes("engineer") ||
            text.includes("developer") ||
            text.includes("programming") ||
            text.includes("software") ||
            text.includes("code") ||
            text.includes("github") ||
            text.includes("javascript") ||
            text.includes("python")
          )
            candidates.push({ name: "Engineering", confidence: 0.8 });

          if (
            text.includes("business") ||
            text.includes("startup") ||
            text.includes("funding") ||
            text.includes("market") ||
            text.includes("revenue") ||
            text.includes("ceo") ||
            text.includes("investment") ||
            text.includes("vc")
          )
            candidates.push({ name: "Business", confidence: 0.75 });

          if (
            text.includes("product") ||
            text.includes("launch") ||
            text.includes("feature") ||
            text.includes("roadmap") ||
            text.includes("release") ||
            text.includes("user experience")
          )
            candidates.push({ name: "Product", confidence: 0.7 });

          if (text.includes("design") || text.includes("ui") || text.includes("ux"))
            candidates.push({ name: "Design", confidence: 0.7 });

          if (
            text.includes("data") ||
            text.includes("analytics") ||
            text.includes("metrics") ||
            text.includes("statistics")
          )
            candidates.push({ name: "Data Science", confidence: 0.75 });

          if (
            text.includes("devops") ||
            text.includes("cloud") ||
            text.includes("docker") ||
            text.includes("kubernetes") ||
            text.includes("aws") ||
            text.includes("azure")
          )
            candidates.push({ name: "DevOps", confidence: 0.75 });

          if (
            text.includes("security") ||
            text.includes("privacy") ||
            text.includes("breach") ||
            text.includes("vulnerability") ||
            text.includes("hack")
          )
            candidates.push({ name: "Security", confidence: 0.8 });

          if (
            text.includes("leadership") ||
            text.includes("management") ||
            text.includes("team") ||
            text.includes("culture") ||
            text.includes("hiring")
          )
            candidates.push({ name: "Leadership", confidence: 0.7 });

          // uniq + top 3
          const unique = candidates
            .filter((t, i, arr) => i === arr.findIndex((x) => x.name === t.name))
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 3);

          if (unique.length === 0) unique.push({ name: "Business", confidence: 0.5 });

          for (const t of unique) {
            const topicRow = await db
              .select()
              .from(topics)
              .where(sql`lower(${topics.name}) = ${t.name.toLowerCase()}`)
              .limit(1);
            if (topicRow[0]) {
              await db.insert(contentTopics).values({
                contentId: article.id,
                topicId: topicRow[0].id,
                confidence: t.confidence,
              });
            }
          }

          classified++;
        } catch (e) {
          console.error(`❌ Failed to classify "${article.title}":`, e);
        }
      }

      res.json({
        success: true,
        message: `Classified ${classified}/${unclassified.length} articles with keyword fallback`,
      });
    } catch (err) {
      console.error("❌ Auto-classification failed:", err);
      res.status(500).json({
        error: "Failed to classify content automatically",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.post("/api/admin/ingest/rss-fallback", async (req, res) => {
    try {
      const { limit = 3 } = req.body;
      const { db } = await import("./db");
      const { feeds, content, insertContentSchema } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const Parser = (await import("rss-parser")).default;

      console.log("🔄 Starting RSS ingestion (fallback mode)...");
      const activeFeeds = await db.select().from(feeds).where(eq(feeds.isActive, true));
      if (activeFeeds.length === 0) {
        return res.json({ success: false, message: "No active feeds found" });
      }

      const parser = new Parser();
      let totalIngested = 0;
      const results: any[] = [];

      for (const feed of activeFeeds.slice(0, 2)) {
        try {
          const feedData = await parser.parseURL(feed.url);

          for (const item of feedData.items.slice(0, limit)) {
            try {
              const exists = await db
                .select()
                .from(content)
                .where(eq(content.url, item.link || ""))
                .limit(1);
              if (exists.length > 0) continue;

              const contentData = insertContentSchema.parse({
                title: item.title || "Untitled",
                description: item.contentSnippet || item.summary || "",
                url: item.link || "",
                source: feed.name,
                contentType: "article",
                author: item.creator || item.author || null,
                publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
                embedding: null,
                status: "pending",
              });
              await db.insert(content).values(contentData);
              totalIngested++;
            } catch (e) {
              console.error(`❌ Failed to ingest item from ${feed.name}:`, e);
            }
          }

          results.push({
            feedName: feed.name,
            itemsProcessed: Math.min(limit, feedData.items.length),
          });
        } catch (e) {
          console.error(`❌ Failed to fetch feed ${feed.name}:`, e);
          results.push({
            feedName: feed.name,
            error: e instanceof Error ? e.message : "Unknown error",
          });
        }
      }

      res.json({
        success: true,
        message: `Ingested ${totalIngested} items in fallback mode (no AI classification)`,
        totalIngested,
        results,
        note: "Content ingested without AI classification due to OpenAI quota limits",
      });
    } catch (err) {
      console.error("RSS fallback ingestion failed:", err);
      res.status(500).json({
        error: "RSS fallback ingestion failed",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
