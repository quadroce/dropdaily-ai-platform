import { db } from "../db";
import { feeds, content, contentTopics, InsertFeed, InsertContent } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { topics } from "@shared/schema";
import { feedsLoader } from "../lib/feeds-loader";
import { RSSParser, type ParsedArticle, type FeedParseResult } from "../lib/rss-parser";
import { Classifier } from "../lib/classifier";

/**
 * Content ingestion service - handles RSS feed processing and storage
 */
export class IngestionService {
  private rssParser: RSSParser;

  constructor() {
    this.rssParser = new RSSParser();
  }

  /**
   * Main ingestion pipeline - run daily at 3:00 AM
   */
  async runDailyIngestion(): Promise<void> {
    console.log('🚀 Starting daily content ingestion pipeline');
    const startTime = Date.now();

    try {
      // 1. Load feeds configuration
      const feedConfigs = feedsLoader.reloadIfStale(30); // Reload if older than 30 minutes
      
      // 2. Sync feeds with database
      await this.syncFeedsWithDatabase(feedConfigs);
      
      // 3. Parse RSS feeds
      const parseResults = await this.rssParser.parseFeeds(feedConfigs, 3);
      
      // 4. Process and store articles
      const processedCount = await this.processParseResults(parseResults);
      
      // 5. Update feed metadata
      await this.updateFeedMetadata(parseResults);
      
      const duration = Date.now() - startTime;
      console.log(`🎉 Daily ingestion completed in ${duration}ms. Processed ${processedCount} new articles.`);
      
    } catch (error) {
      console.error('❌ Daily ingestion failed:', error);
      throw error;
    }
  }

  /**
   * Sync feed configurations with database
   */
  private async syncFeedsWithDatabase(feedConfigs: any[]): Promise<void> {
    console.log('🔄 Syncing feeds with database');

    for (const feedConfig of feedConfigs) {
      try {
        // Check if feed exists
        const existingFeed = await db
          .select()
          .from(feeds)
          .where(eq(feeds.url, feedConfig.url))
          .limit(1);

        if (existingFeed.length === 0) {
          // Insert new feed
          await db.insert(feeds).values({
            name: feedConfig.name,
            url: feedConfig.url,
            tags: feedConfig.tags,
            isActive: true,
          });
          console.log(`✅ Added new feed: ${feedConfig.name}`);
        } else {
          // Update existing feed
          await db
            .update(feeds)
            .set({
              name: feedConfig.name,
              tags: feedConfig.tags,
              isActive: true,
              updatedAt: new Date(),
            })
            .where(eq(feeds.url, feedConfig.url));
        }
      } catch (error) {
        console.error(`❌ Failed to sync feed ${feedConfig.name}:`, error);
      }
    }
  }

  /**
   * Process parse results and store new articles
   */
  private async processParseResults(parseResults: FeedParseResult[]): Promise<number> {
    let totalProcessed = 0;

    for (const result of parseResults) {
      if (result.error) {
        console.warn(`⚠️ Skipping failed feed: ${result.feed.name} - ${result.error}`);
        continue;
      }

      // Get feed ID from database
      const feedRecord = await db
        .select()
        .from(feeds)
        .where(eq(feeds.url, result.feed.url))
        .limit(1);

      if (feedRecord.length === 0) {
        console.warn(`⚠️ Feed not found in database: ${result.feed.url}`);
        continue;
      }

      const feedId = feedRecord[0].id;

      // Filter and process articles
      const validArticles = result.articles
        .filter(article => RSSParser.isRecent(article, 7)) // Last 7 days
        .filter(article => RSSParser.hasMinimumContent(article, 50)); // Minimum content

      if (validArticles.length === 0) {
        console.log(`ℹ️ No valid articles found in ${result.feed.name}`);
        continue;
      }

      // Process articles in batches
      const batchSize = 10;
      for (let i = 0; i < validArticles.length; i += batchSize) {
        const batch = validArticles.slice(i, i + batchSize);
        const processed = await this.processBatch(batch, feedId);
        totalProcessed += processed;
      }
    }

    return totalProcessed;
  }

  /**
   * Process a batch of articles
   */
  private async processBatch(articles: ParsedArticle[], feedId: string): Promise<number> {
    let processedCount = 0;

    for (const article of articles) {
      try {
        // Check for duplicates
        const existing = await this.findDuplicateContent(article);
        if (existing) {
          console.log(`⏭️ Skipping duplicate: ${article.title}`);
          continue;
        }

        // Store article
        const contentRecord = await this.storeArticle(article, feedId);
        
        // Classify and store topics with OpenAI
        const classification = await Classifier.classifyArticle(article, contentRecord.id, {
          minSimilarity: 0.65,
          maxClassifications: 5,
          generateSummary: true,
        });

        // Store classifications - always try to store even if 0 classifications
        console.log(`💾 Storing ${classification.classifications.length} classifications for: ${article.title}`);
        if (classification.classifications.length > 0) {
          await Classifier.storeClassifications([classification]);
        } else {
          console.log(`⚠️ No classifications found for: ${article.title} - will create fallback classifications`);
          
          // Create fallback topic classifications for better matching
          const fallbackTopics = [];
          const text = (article.title + ' ' + (article.description || '')).toLowerCase();
          
          if (text.includes('ai') || text.includes('artificial intelligence') || text.includes('machine learning')) {
            fallbackTopics.push({ name: 'AI/ML', confidence: 0.8 });
          }
          if (text.includes('tech') || text.includes('engineering') || text.includes('developer') || text.includes('programming')) {
            fallbackTopics.push({ name: 'Engineering', confidence: 0.7 });
          }
          if (text.includes('business') || text.includes('startup') || text.includes('company')) {
            fallbackTopics.push({ name: 'Business', confidence: 0.6 });
          }
          
          // Add at least one general topic if no specific match
          if (fallbackTopics.length === 0) {
            fallbackTopics.push({ name: 'Business', confidence: 0.5 });
          }
          
          // Create topic IDs from our database topics
          for (const topic of fallbackTopics) {
            const dbTopic = await db.select().from(topics).where(eq(topics.name, topic.name)).limit(1);
            if (dbTopic[0]) {
              classification.classifications.push({
                topicId: dbTopic[0].id,
                topicName: topic.name,
                confidence: topic.confidence,
                similarity: topic.confidence
              });
            }
          }
          
          if (classification.classifications.length > 0) {
            await Classifier.storeClassifications([classification]);
            console.log(`✅ Created fallback classifications for: ${article.title}`);
          }
        }

        // Update content with embedding and summary
        await db
          .update(content)
          .set({
            embedding: JSON.stringify(classification.embedding),
            summary: classification.summary,
            updatedAt: new Date(),
          })
          .where(eq(content.id, contentRecord.id));

        processedCount++;
        console.log(`✅ Processed: ${article.title}`);

      } catch (error) {
        console.error(`❌ Failed to process article: ${article.title}`, error);
      }
    }

    return processedCount;
  }

  /**
   * Store article in database
   */
  private async storeArticle(article: ParsedArticle, feedId: string) {
    const contentData: InsertContent = {
      feedId,
      title: article.title,
      description: article.description,
      url: article.url,
      source: 'rss',
      contentType: 'article',
      guid: article.guid,
      publishedAt: article.publishedAt,
      fullContent: article.content,
      metadata: {
        author: article.author,
        categories: article.categories,
      },
    };

    const [contentRecord] = await db.insert(content).values(contentData).returning();
    return contentRecord;
  }

  /**
   * Find duplicate content by URL or GUID
   */
  private async findDuplicateContent(article: ParsedArticle): Promise<boolean> {
    // Check by URL first
    const byUrl = await db
      .select()
      .from(content)
      .where(eq(content.url, article.url))
      .limit(1);

    if (byUrl.length > 0) return true;

    // Check by GUID if available
    if (article.guid) {
      const byGuid = await db
        .select()
        .from(content)
        .where(eq(content.guid, article.guid))
        .limit(1);

      if (byGuid.length > 0) return true;
    }

    return false;
  }

  /**
   * Update feed metadata after parsing
   */
  private async updateFeedMetadata(parseResults: FeedParseResult[]): Promise<void> {
    for (const result of parseResults) {
      try {
        await db
          .update(feeds)
          .set({
            lastFetched: result.lastFetched,
            lastError: result.error || null,
            updatedAt: new Date(),
          })
          .where(eq(feeds.url, result.feed.url));
      } catch (error) {
        console.error(`❌ Failed to update feed metadata for ${result.feed.name}:`, error);
      }
    }
  }

  /**
   * Manual ingestion for testing
   */
  async ingestSingleFeed(feedUrl: string): Promise<void> {
    const feedConfigs = feedsLoader.getFeeds();
    const feedConfig = feedConfigs.find(f => f.url === feedUrl);
    
    if (!feedConfig) {
      throw new Error(`Feed not found: ${feedUrl}`);
    }

    console.log(`🔄 Manually ingesting feed: ${feedConfig.name}`);
    
    const parseResult = await this.rssParser.parseFeed(feedConfig);
    await this.processParseResults([parseResult]);
    
    console.log(`✅ Manual ingestion completed for ${feedConfig.name}`);
  }

  /**
   * Get ingestion statistics
   */
  async getIngestionStats(): Promise<{
    totalFeeds: number;
    activeFeeds: number;
    totalContent: number;
    recentContent: number;
    lastIngestion?: Date;
  }> {
    const [
      totalFeeds,
      activeFeeds,
      totalContent,
      recentContent,
      lastFeed
    ] = await Promise.all([
      db.select({ count: sql`count(*)` }).from(feeds),
      db.select({ count: sql`count(*)` }).from(feeds).where(eq(feeds.isActive, true)),
      db.select({ count: sql`count(*)` }).from(content),
      db.select({ count: sql`count(*)` }).from(content)
        .where(sql`created_at > now() - interval '24 hours'`),
      db.select({ lastFetched: feeds.lastFetched })
        .from(feeds)
        .where(sql`last_fetched IS NOT NULL`)
        .orderBy(sql`last_fetched DESC`)
        .limit(1)
    ]);

    return {
      totalFeeds: Number(totalFeeds[0].count),
      activeFeeds: Number(activeFeeds[0].count),
      totalContent: Number(totalContent[0].count),
      recentContent: Number(recentContent[0].count),
      lastIngestion: lastFeed[0]?.lastFetched || undefined,
    };
  }
}

export const ingestionService = new IngestionService();