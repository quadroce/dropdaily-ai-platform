import { z } from "zod";
import { readFileSync } from "fs";
import { join } from "path";

// Feed configuration schema
export const feedConfigSchema = z.object({
  name: z.string().min(1, "Feed name is required"),
  url: z.string().url("Must be a valid URL"),
  tags: z.array(z.string()).min(1, "At least one tag is required"),
});

export type FeedConfig = z.infer<typeof feedConfigSchema>;

export const feedsArraySchema = z.array(feedConfigSchema);

/**
 * Loads and validates feeds configuration from feeds.json
 */
export class FeedsLoader {
  private static instance: FeedsLoader;
  private feeds: FeedConfig[] = [];
  private lastLoaded: Date | null = null;

  private constructor() {}

  static getInstance(): FeedsLoader {
    if (!FeedsLoader.instance) {
      FeedsLoader.instance = new FeedsLoader();
    }
    return FeedsLoader.instance;
  }

  /**
   * Load feeds from feeds.json file
   */
  loadFeeds(filePath: string = "feeds.json"): FeedConfig[] {
    try {
      const fullPath = join(process.cwd(), filePath);
      const fileContent = readFileSync(fullPath, "utf-8");
      const rawFeeds = JSON.parse(fileContent);
      
      // Validate feeds against schema
      const validatedFeeds = feedsArraySchema.parse(rawFeeds);
      
      this.feeds = validatedFeeds;
      this.lastLoaded = new Date();
      
      console.log(`✅ Loaded ${validatedFeeds.length} feeds from ${filePath}`);
      return validatedFeeds;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("❌ Feed validation failed:", error.errors);
        throw new Error(`Feed validation failed: ${error.errors.map(e => e.message).join(", ")}`);
      }
      
      console.error("❌ Failed to load feeds:", error);
      throw error;
    }
  }

  /**
   * Get currently loaded feeds
   */
  getFeeds(): FeedConfig[] {
    if (!this.lastLoaded) {
      this.loadFeeds();
    }
    return this.feeds;
  }

  /**
   * Reload feeds if they haven't been loaded recently
   */
  reloadIfStale(maxAgeMinutes: number = 60): FeedConfig[] {
    if (!this.lastLoaded || 
        Date.now() - this.lastLoaded.getTime() > maxAgeMinutes * 60 * 1000) {
      return this.loadFeeds();
    }
    return this.feeds;
  }

  /**
   * Validate a single feed configuration
   */
  static validateFeed(feed: unknown): FeedConfig {
    return feedConfigSchema.parse(feed);
  }

  /**
   * Get feed by name
   */
  getFeedByName(name: string): FeedConfig | undefined {
    return this.feeds.find(feed => feed.name === name);
  }

  /**
   * Get feeds by tag
   */
  getFeedsByTag(tag: string): FeedConfig[] {
    return this.feeds.filter(feed => feed.tags.includes(tag));
  }
}

export const feedsLoader = FeedsLoader.getInstance();