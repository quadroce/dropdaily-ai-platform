import OpenAI from "openai";
import { db } from "../db";
import { topics, contentTopics } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import type { ParsedArticle } from "./rss-parser";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TopicClassification {
  topicId: string;
  topicName: string;
  confidence: number;
  similarity: number;
}

export interface ClassificationResult {
  contentId: string;
  embedding: number[];
  classifications: TopicClassification[];
  summary?: string;
}

/**
 * AI-powered content classifier using OpenAI embeddings
 */
export class Classifier {
  private static topicsCache: { id: string; name: string; embedding: number[] }[] = [];
  private static lastCacheUpdate: Date | null = null;

  /**
   * Classify a single article
   */
  static async classifyArticle(
    article: ParsedArticle,
    contentId: string,
    options: {
      minSimilarity?: number;
      maxClassifications?: number;
      generateSummary?: boolean;
    } = {}
  ): Promise<ClassificationResult> {
    const {
      minSimilarity = 0.7,
      maxClassifications = 3,
      generateSummary = true,
    } = options;

    console.log(`🤖 Classifying article: ${article.title}`);

    try {
      // Prepare text for embedding
      const textForEmbedding = this.prepareTextForEmbedding(article);
      
      // Generate embedding
      const embedding = await this.generateEmbedding(textForEmbedding);
      
      // Get topic classifications
      const classifications = await this.findSimilarTopics(
        embedding,
        minSimilarity,
        maxClassifications
      );

      // Generate summary if requested
      let summary: string | undefined;
      if (generateSummary && article.description) {
        summary = await this.generateSummary(article);
      }

      console.log(`✅ Classified article with ${classifications.length} topics`);

      return {
        contentId,
        embedding,
        classifications,
        summary,
      };
    } catch (error) {
      console.error(`❌ Classification failed for article: ${article.title}`, error);
      throw error;
    }
  }

  /**
   * Classify multiple articles in batch
   */
  static async classifyArticles(
    articles: { article: ParsedArticle; contentId: string }[],
    options?: {
      minSimilarity?: number;
      maxClassifications?: number;
      generateSummary?: boolean;
      batchSize?: number;
    }
  ): Promise<ClassificationResult[]> {
    const { batchSize = 5, ...classifyOptions } = options || {};
    
    console.log(`🚀 Starting batch classification of ${articles.length} articles`);

    const results: ClassificationResult[] = [];
    
    // Process in batches to manage API rate limits
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      const batchPromises = batch.map(({ article, contentId }) =>
        this.classifyArticle(article, contentId, classifyOptions)
      );

      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error('❌ Batch classification error:', result.reason);
          }
        }
      } catch (error) {
        console.error('❌ Batch processing error:', error);
      }

      // Rate limiting delay
      if (i + batchSize < articles.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`🎉 Batch classification complete: ${results.length}/${articles.length} successful`);
    return results;
  }

  /**
   * Store classification results in database
   */
  static async storeClassifications(results: ClassificationResult[]): Promise<void> {
    console.log(`💾 Storing ${results.length} classification results`);

    for (const result of results) {
      try {
        // Store content topics relationships
        if (result.classifications.length > 0) {
          const contentTopicData = result.classifications.map(classification => ({
            contentId: result.contentId,
            topicId: classification.topicId,
            confidence: classification.confidence,
          }));

          await db.insert(contentTopics).values(contentTopicData);
        }
      } catch (error) {
        console.error(`❌ Failed to store classifications for content ${result.contentId}:`, error);
      }
    }

    console.log(`✅ Classification storage complete`);
  }

  /**
   * Generate OpenAI embedding for text
   */
  private static async generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  }

  /**
   * Find similar topics using vector similarity
   */
  private static async findSimilarTopics(
    embedding: number[],
    minSimilarity: number,
    maxResults: number
  ): Promise<TopicClassification[]> {
    // Refresh topics cache if needed
    await this.refreshTopicsCache();

    const similarities: TopicClassification[] = [];

    for (const topic of this.topicsCache) {
      const similarity = this.cosineSimilarity(embedding, topic.embedding);
      
      if (similarity >= minSimilarity) {
        similarities.push({
          topicId: topic.id,
          topicName: topic.name,
          confidence: similarity,
          similarity,
        });
      }
    }

    // Sort by similarity and return top results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }

  /**
   * Refresh topics cache from database
   */
  private static async refreshTopicsCache(): Promise<void> {
    // Cache for 1 hour
    if (this.lastCacheUpdate && 
        Date.now() - this.lastCacheUpdate.getTime() < 60 * 60 * 1000) {
      return;
    }

    console.log('🔄 Refreshing topics cache');

    const topicsData = await db.select().from(topics).where(sql`${topics.embedding} IS NOT NULL`);
    
    this.topicsCache = topicsData
      .filter(topic => topic.embedding)
      .map(topic => ({
        id: topic.id,
        name: topic.name,
        embedding: JSON.parse(topic.embedding!),
      }));

    this.lastCacheUpdate = new Date();
    console.log(`✅ Loaded ${this.topicsCache.length} topics into cache`);
  }

  /**
   * Prepare article text for embedding generation
   */
  private static prepareTextForEmbedding(article: ParsedArticle): string {
    const parts: string[] = [];
    
    // Title is most important
    if (article.title) {
      parts.push(article.title);
    }
    
    // Description/summary
    if (article.description) {
      parts.push(article.description);
    }
    
    // Categories can provide context
    if (article.categories && article.categories.length > 0) {
      parts.push(`Categories: ${article.categories.join(', ')}`);
    }

    // Truncate to reasonable length for embedding
    const text = parts.join('\n\n');
    return text.length > 2000 ? text.substring(0, 2000) + '...' : text;
  }

  /**
   * Generate article summary using GPT
   */
  private static async generateSummary(article: ParsedArticle): Promise<string> {
    const content = article.content || article.description || '';
    
    if (content.length < 100) {
      return content; // Too short to summarize
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a professional content summarizer. Create concise, engaging summaries for busy professionals. Focus on key insights and actionable information."
          },
          {
            role: "user",
            content: `Please summarize this article in 2-3 sentences:\n\nTitle: ${article.title}\n\nContent: ${content}`
          }
        ],
        max_tokens: 150,
        temperature: 0.3,
      });

      return response.choices[0].message.content || content.substring(0, 200) + '...';
    } catch (error) {
      console.warn('⚠️ Failed to generate summary, using original description');
      return content.substring(0, 200) + '...';
    }
  }
}