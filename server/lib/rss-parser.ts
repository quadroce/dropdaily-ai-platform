import Parser from "rss-parser";
import { FeedConfig } from "./feeds-loader";

export interface ParsedArticle {
  title: string;
  description?: string;
  url: string;
  publishedAt?: Date;
  guid?: string;
  author?: string;
  categories?: string[];
  content?: string;
  summary?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
}

export interface FeedParseResult {
  feed: FeedConfig;
  articles: ParsedArticle[];
  error?: string;
  lastFetched: Date;
}

/**
 * RSS/Atom feed parser with error handling and normalization
 */
export class RSSParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'DropDaily/1.0 (Content Discovery Platform)',
      },
      customFields: {
        item: [
          ['content:encoded', 'contentEncoded'],
          ['description', 'description'],
          ['summary', 'summary'],
          ['media:content', 'mediaContent'],
          ['media:thumbnail', 'mediaThumbnail'],
          ['enclosure', 'enclosure'],
        ]
      }
    });
  }

  /**
   * Parse a single RSS feed
   */
  async parseFeed(feedConfig: FeedConfig): Promise<FeedParseResult> {
    const startTime = Date.now();
    console.log(`🔄 Parsing feed: ${feedConfig.name} (${feedConfig.url})`);

    try {
      const feed = await this.parser.parseURL(feedConfig.url);
      
      const articles: ParsedArticle[] = [];
      
      for (const item of feed.items || []) {
        try {
          const article = this.normalizeItem(item);
          if (article) {
            articles.push(article);
          }
        } catch (error) {
          console.warn(`⚠️  Skipping malformed item in ${feedConfig.name}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Parsed ${articles.length} articles from ${feedConfig.name} in ${duration}ms`);

      return {
        feed: feedConfig,
        articles,
        lastFetched: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Failed to parse ${feedConfig.name} after ${duration}ms:`, errorMessage);
      
      return {
        feed: feedConfig,
        articles: [],
        error: errorMessage,
        lastFetched: new Date(),
      };
    }
  }

  /**
   * Parse multiple feeds in parallel with controlled concurrency
   */
  async parseFeeds(feedConfigs: FeedConfig[], concurrency: number = 5): Promise<FeedParseResult[]> {
    console.log(`🚀 Starting to parse ${feedConfigs.length} feeds with concurrency ${concurrency}`);

    const results: FeedParseResult[] = [];
    
    // Process feeds in batches to avoid overwhelming servers
    for (let i = 0; i < feedConfigs.length; i += concurrency) {
      const batch = feedConfigs.slice(i, i + concurrency);
      const batchPromises = batch.map(feed => this.parseFeed(feed));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error('❌ Batch parsing error:', result.reason);
          }
        }
      } catch (error) {
        console.error('❌ Batch processing error:', error);
      }
      
      // Small delay between batches to be respectful
      if (i + concurrency < feedConfigs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => !r.error).length;
    const totalArticles = results.reduce((sum, r) => sum + r.articles.length, 0);
    
    console.log(`🎉 Parsing complete: ${successCount}/${feedConfigs.length} feeds successful, ${totalArticles} total articles`);
    
    return results;
  }

  /**
   * Normalize RSS item to our standard format
   */
  private normalizeItem(item: any): ParsedArticle | null {
    // Required fields
    if (!item.title || !item.link) {
      return null;
    }

    const article: ParsedArticle = {
      title: this.cleanText(item.title),
      url: item.link,
    };

    // Optional fields
    if (item.contentSnippet || item.contentEncoded || item.description || item.summary) {
      article.description = this.cleanText(
        item.contentSnippet || 
        this.stripHtml(item.contentEncoded) || 
        this.stripHtml(item.description) || 
        this.stripHtml(item.summary) || 
        ""
      );
    }

    if (item.contentEncoded) {
      article.content = this.cleanText(this.stripHtml(item.contentEncoded));
    }

    if (item.pubDate || item.isoDate) {
      const date = new Date(item.pubDate || item.isoDate);
      if (!isNaN(date.getTime())) {
        article.publishedAt = date;
      }
    }

    if (item.guid || item.id) {
      article.guid = item.guid || item.id;
    }

    if (item.creator || item.author) {
      article.author = this.cleanText(item.creator || item.author);
    }

    // Extract images from various RSS formats
    const imageUrl = this.extractImageUrl(item);
    if (imageUrl) {
      article.imageUrl = imageUrl;
      article.thumbnailUrl = imageUrl; // Use same image for thumbnail
    }

    if (item.categories && Array.isArray(item.categories)) {
      article.categories = item.categories.map((cat: any) => 
        typeof cat === 'string' ? cat : cat.name || cat.term || ''
      ).filter(Boolean);
    }

    return article;
  }

  /**
   * Extract image URL from RSS item
   */
  private extractImageUrl(item: any): string | null {
    // Try various RSS image formats
    
    // 1. Media RSS namespace (media:content, media:thumbnail)
    if (item.mediaContent && Array.isArray(item.mediaContent)) {
      const imageMedia = item.mediaContent.find((m: any) => 
        m.$ && m.$.type && m.$.type.startsWith('image/')
      );
      if (imageMedia && imageMedia.$.url) {
        return imageMedia.$.url;
      }
    }
    
    if (item.mediaThumbnail && item.mediaThumbnail.$ && item.mediaThumbnail.$.url) {
      return item.mediaThumbnail.$.url;
    }
    
    // 2. Enclosure (like iTunes)
    if (item.enclosure && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
      return item.enclosure.url;
    }
    
    // 3. Try to extract from content/description HTML
    if (item.contentEncoded || item.description) {
      const content = item.contentEncoded || item.description;
      const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      if (imgMatch && imgMatch[1]) {
        return imgMatch[1];
      }
    }
    
    // 4. Look for common image fields
    if (item.image) {
      if (typeof item.image === 'string') {
        return item.image;
      }
      if (item.image.url) {
        return item.image.url;
      }
    }
    
    // 5. iTunes specific
    if (item['itunes:image'] && item['itunes:image'].href) {
      return item['itunes:image'].href;
    }
    
    return null;
  }

  /**
   * Clean text by trimming and normalizing whitespace
   */
  private cleanText(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();
  }

  /**
   * Basic HTML tag removal
   */
  private stripHtml(html: string): string {
    if (!html) return '';
    
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[#\w]+;/g, ' ') // Remove HTML entities
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Check if article is recent (within last N days)
   */
  static isRecent(article: ParsedArticle, maxAgeDays: number = 7): boolean {
    if (!article.publishedAt) return true; // Include if no date
    
    const ageMs = Date.now() - article.publishedAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    
    return ageDays <= maxAgeDays;
  }

  /**
   * Filter articles by minimum text length
   */
  static hasMinimumContent(article: ParsedArticle, minLength: number = 100): boolean {
    const textLength = (article.description || '').length + (article.content || '').length;
    return textLength >= minLength;
  }
}