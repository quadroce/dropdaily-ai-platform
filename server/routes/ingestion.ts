import { Router } from "express";
import { ingestionService } from "../services/ingestion";
import { schedulerService } from "../services/scheduler";
import { feedsLoader } from "../lib/feeds-loader";

const router = Router();

/**
 * Manual ingestion trigger (for testing and admin)
 */
router.post("/ingest/run", async (req, res) => {
  try {
    await schedulerService.runIngestionNow();
    res.json({ 
      success: true, 
      message: "Manual ingestion completed successfully" 
    });
  } catch (error) {
    console.error("Manual ingestion failed:", error);
    res.status(500).json({ 
      error: "Ingestion failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

/**
 * Manual daily drop generation (for testing and admin)
 */
router.post("/daily-drops/run", async (req, res) => {
  try {
    await schedulerService.runDailyDropsNow();
    res.json({ 
      success: true, 
      message: "Daily drops generated and sent successfully" 
    });
  } catch (error) {
    console.error("Daily drops generation failed:", error);
    res.status(500).json({ 
      error: "Daily drops generation failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

/**
 * Test single feed ingestion
 */
router.post("/ingest/test-feed", async (req, res) => {
  try {
    const { feedUrl } = req.body;
    
    if (!feedUrl) {
      return res.status(400).json({ error: "feedUrl is required" });
    }

    await schedulerService.testFeedIngestion(feedUrl);
    res.json({ 
      success: true, 
      message: `Test ingestion completed for ${feedUrl}` 
    });
  } catch (error) {
    console.error("Test feed ingestion failed:", error);
    res.status(500).json({ 
      error: "Test ingestion failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

/**
 * Get ingestion statistics
 */
router.get("/ingest/stats", async (req, res) => {
  try {
    const stats = await ingestionService.getIngestionStats();
    res.json(stats);
  } catch (error) {
    console.error("Failed to get ingestion stats:", error);
    res.status(500).json({ 
      error: "Failed to get statistics" 
    });
  }
});

/**
 * Get daily drop statistics
 */
router.get("/daily-drops/stats", async (req, res) => {
  try {
    const { dailyDropService } = await import("../services/daily-drop");
    const stats = await dailyDropService.getDailyDropStats();
    res.json(stats);
  } catch (error) {
    console.error("Failed to get daily drop stats:", error);
    res.status(500).json({ 
      error: "Failed to get statistics" 
    });
  }
});

/**
 * Get scheduler status
 */
router.get("/scheduler/status", async (req, res) => {
  try {
    const status = schedulerService.getStatus();
    res.json(status);
  } catch (error) {
    console.error("Failed to get scheduler status:", error);
    res.status(500).json({ 
      error: "Failed to get scheduler status" 
    });
  }
});

/**
 * Start scheduler
 */
router.post("/scheduler/start", async (req, res) => {
  try {
    schedulerService.start();
    res.json({ 
      success: true, 
      message: "Scheduler started successfully" 
    });
  } catch (error) {
    console.error("Failed to start scheduler:", error);
    res.status(500).json({ 
      error: "Failed to start scheduler" 
    });
  }
});

/**
 * Stop scheduler
 */
router.post("/scheduler/stop", async (req, res) => {
  try {
    schedulerService.stop();
    res.json({ 
      success: true, 
      message: "Scheduler stopped successfully" 
    });
  } catch (error) {
    console.error("Failed to stop scheduler:", error);
    res.status(500).json({ 
      error: "Failed to stop scheduler" 
    });
  }
});

/**
 * Get feeds configuration
 */
router.get("/feeds", async (req, res) => {
  try {
    const feeds = feedsLoader.getFeeds();
    res.json(feeds);
  } catch (error) {
    console.error("Failed to get feeds:", error);
    res.status(500).json({ 
      error: "Failed to get feeds configuration" 
    });
  }
});

/**
 * Reload feeds configuration
 */
router.post("/feeds/reload", async (req, res) => {
  try {
    const feeds = feedsLoader.loadFeeds();
    res.json({ 
      success: true, 
      message: `Reloaded ${feeds.length} feeds`,
      feeds 
    });
  } catch (error) {
    console.error("Failed to reload feeds:", error);
    res.status(500).json({ 
      error: "Failed to reload feeds", 
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

export default router;