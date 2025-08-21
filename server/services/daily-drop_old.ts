import { db } from "../db";
import { 
  users, 
  userPreferences, 
  content, 
  contentTopics, 
  dailyDrops, 
  topics,
  InsertDailyDrop 
} from "@shared/schema";
import { eq, and, sql, desc, notInArray } from "drizzle-orm";
import { emailService } from "./email";

export interface UserContentMatch {
  userId: string;
  contentId: string;
  score: number;
  content: {
    id: string;
    title: string;
    description?: string;
    url: string;
    source: string;
    summary?: string;
    publishedAt?: Date;
  };
}

/**
 * Daily Drop service - generates and delivers personalized content
 */
export class DailyDropService {
  
  /**
   * Main daily drop generation and sending pipeline
   */
  async generateAndSendDailyDrops(): Promise<void> {
    console.log('🎯 Starting daily drop generation pipeline');
    const startTime = Date.now();

    try {
      // Get all onboarded users
      const onboardedUsers = await this.getOnboardedUsers();
      console.log(`👥 Found ${onboardedUsers.length} onboarded users`);

      if (onboardedUsers.length === 0) {
        console.log('ℹ️ No onboarded users found, skipping daily drops');
        return;
      }

      // Generate drops for each user
      let totalDropsGenerated = 0;
      let totalEmailsSent = 0;

      for (const user of onboardedUsers) {
        try {
          const userDrops = await this.generateUserDailyDrop(user.id);
          
          if (userDrops.length > 0) {
            await this.storeDailyDrops(userDrops);
            
            // Send email
            const emailSent = await this.sendDailyDropEmail(user, userDrops);
            if (emailSent) {
              await this.markEmailSent(userDrops.map(d => d.contentId), user.id);
              totalEmailsSent++;
            }
            
            totalDropsGenerated += userDrops.length;
            console.log(`✅ Generated ${userDrops.length} drops for ${user.firstName} ${user.lastName}`);
          }
        } catch (error) {
          console.error(`❌ Failed to generate drops for user ${user.id}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`🎉 Daily drop generation completed in ${duration}ms:`);
      console.log(`  - ${totalDropsGenerated} total drops generated`);
      console.log(`  - ${totalEmailsSent} emails sent`);
      
    } catch (error) {
      console.error('❌ Daily drop generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate daily drop for a single user
   */
  async generateUserDailyDrop(
    userId: string, 
    maxItems: number = 3
  ): Promise<InsertDailyDrop[]> {
    console.log(`🔍 Generating daily drop for user ${userId}`);

    try {
      // Get user preferences
      const userTopics = await this.getUserTopicPreferences(userId);
      console.log(`📊 Found ${userTopics.length} topic preferences for user ${userId}`);
      
      if (userTopics.length === 0) {
        console.log(`⚠️ User ${userId} has no topic preferences`);
        return [];
      }

      // Get content already sent to user in last 30 days
      const recentDrops = await this.getRecentUserDrops(userId, 30);
      const excludeContentIds = recentDrops.map(drop => drop.contentId);

      // Find matching content using vector similarity
      const contentMatches = await this.findMatchingContent(
        userTopics,
        excludeContentIds,
        maxItems * 3 // Get more candidates for better selection
      );

      if (contentMatches.length === 0) {
        console.log(`ℹ️ No matching content found for user ${userId}`);
        return [];
      }

      // Select top items with diversity (YouTube prioritized first)
      const selectedContent = this.selectDiverseContent(contentMatches, maxItems);

      // Create daily drop records
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of day

      const dailyDrops: InsertDailyDrop[] = selectedContent.map(match => ({
        userId,
        contentId: match.contentId,
        dropDate: today,
        matchScore: match.score,
        wasViewed: false,
        wasBookmarked: false,
      }));

      return dailyDrops;
    } catch (error) {
      console.error(`❌ Failed to generate daily drop for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get onboarded users
   */
  private async getOnboardedUsers() {
    return await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.isOnboarded, true));
  }

  /**
   * Get user's topic preferences with weights
   */
  private async getUserTopicPreferences(userId: string) {
    try {
      const result = await db
        .select({
          topicId: userPreferences.topicId,
          weight: userPreferences.weight,
          topicName: topics.name,
          topicEmbedding: topics.embedding,
        })
        .from(userPreferences)
        .innerJoin(topics, eq(userPreferences.topicId, sql`${topics.id}::uuid`))
        .where(eq(userPreferences.userId, userId));
      
      console.log(`🔍 getUserTopicPreferences for ${userId}: found ${result.length} preferences`);
      return result;
    } catch (error) {
      console.error(`❌ Error getting preferences for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get recent drops for user to avoid duplicates
   */
  private async getRecentUserDrops(userId: string, daysBefore: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBefore);

    return await db
      .select({
        contentId: dailyDrops.contentId,
      })
      .from(dailyDrops)
      .where(and(
        eq(dailyDrops.userId, userId),
        sql`${dailyDrops.dropDate} > ${cutoffDate}`
      ));
  }

  /**
   * Find matching content using topic similarity
   */
  private async findMatchingContent(
    userTopics: any[],
    excludeContentIds: string[],
    limit: number = 20
  ): Promise<UserContentMatch[]> {
    
    // Get content from last 7 days with topic classifications
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    let whereConditions = and(
      sql`${content.createdAt} > ${cutoffDate}`,
      eq(content.status, 'approved')
    );

    // Exclude already sent content
    if (excludeContentIds.length > 0) {
      whereConditions = and(
        whereConditions,
        notInArray(content.id, excludeContentIds)
      );
    }

    const contentResults = await db
      .select({
        contentId: content.id,
        title: content.title,
        description: content.description,
        url: content.url,
        source: content.source,
        summary: content.summary,
        publishedAt: content.publishedAt,
        topicId: contentTopics.topicId,
        confidence: contentTopics.confidence,
      })
      .from(content)
      .innerJoin(contentTopics, eq(sql`${content.id}::uuid`, contentTopics.contentId))
      .where(whereConditions)
      .orderBy(desc(content.createdAt))
      .limit(limit * 2); // Get more for filtering

    // Calculate relevance scores
    const contentScores = new Map<string, { score: number; content: any }>();

    for (const result of contentResults) {
      const userTopic = userTopics.find(ut => ut.topicId === result.topicId);
      
      if (userTopic) {
        const score = result.confidence * userTopic.weight;
        const existingScore = contentScores.get(result.contentId);
        
        if (!existingScore || score > existingScore.score) {
          contentScores.set(result.contentId, {
            score,
            content: {
              id: result.contentId,
              title: result.title,
              description: result.description,
              url: result.url,
              source: result.source,
              summary: result.summary,
              publishedAt: result.publishedAt,
            }
          });
        }
      }
    }

    // Convert to array and sort by score
    const matches: UserContentMatch[] = Array.from(contentScores.entries())
      .map(([contentId, { score, content }]) => ({
        userId: '', // Will be set by caller
        contentId,
        score,
        content,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return matches;
  }

  /**
   * Select diverse content with YouTube video prioritized as first card
   */
  private selectDiverseContent(
    matches: UserContentMatch[], 
    maxItems: number
  ): UserContentMatch[] {
    if (matches.length <= maxItems) {
      return this.prioritizeYouTubeFirst(matches);
    }

    const selected: UserContentMatch[] = [];
    const usedSources = new Set<string>();

    // PRIORITY: Find best YouTube video for first position
    const youtubeMatches = matches.filter(m => m.content.source === 'youtube');
    if (youtubeMatches.length > 0) {
      const bestYoutube = youtubeMatches[0]; // Already sorted by score
      selected.push(bestYoutube);
      usedSources.add('youtube');
      console.log(`🎥 Selected YouTube video as first card: "${bestYoutube.content.title}"`);
    }

    // First pass: select top item from each unique source (excluding already used)
    for (const match of matches) {
      if (selected.length >= maxItems) break;
      
      if (!usedSources.has(match.content.source) && 
          !selected.find(s => s.contentId === match.contentId)) {
        selected.push(match);
        usedSources.add(match.content.source);
      }
    }

    // Second pass: fill remaining slots with highest scores
    for (const match of matches) {
      if (selected.length >= maxItems) break;
      
      if (!selected.find(s => s.contentId === match.contentId)) {
        selected.push(match);
      }
    }

    return selected.slice(0, maxItems);
  }

  /**
   * Ensure YouTube content is prioritized first if available
   */
  private prioritizeYouTubeFirst(matches: UserContentMatch[]): UserContentMatch[] {
    const youtubeMatches = matches.filter(m => m.content.source === 'youtube');
    const otherMatches = matches.filter(m => m.content.source !== 'youtube');
    
    if (youtubeMatches.length > 0) {
      console.log(`🎥 Prioritizing YouTube video: "${youtubeMatches[0].content.title}"`);
      return [youtubeMatches[0], ...otherMatches].slice(0, matches.length);
    }
    
    return matches;
  }

  /**
   * Store daily drops in database
   */
  private async storeDailyDrops(drops: InsertDailyDrop[]): Promise<void> {
    if (drops.length === 0) return;

    await db.insert(dailyDrops).values(drops);
  }

  /**
   * Send daily drop email to user
   */
  private async sendDailyDropEmail(
    user: { id: string; email: string; firstName: string; lastName: string },
    drops: InsertDailyDrop[]
  ): Promise<boolean> {
    try {
      // Get full content details for email
      const contentDetails = await db
        .select()
        .from(content)
        .where(sql`${content.id} = ANY(${drops.map(d => d.contentId)})`);

      await emailService.sendDailyDropEmail(user, contentDetails);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send email to ${user.email}:`, error);
      return false;
    }
  }

  /**
   * Mark emails as sent
   */
  private async markEmailSent(contentIds: string[], userId: string): Promise<void> {
    await db
      .update(dailyDrops)
      .set({
        emailSent: true,
        sentAt: new Date(),
      })
      .where(and(
        eq(dailyDrops.userId, userId),
        sql`${dailyDrops.contentId} = ANY(${contentIds})`
      ));
  }

  /**
   * Get daily drop statistics
   */
  async getDailyDropStats(): Promise<{
    totalDropsToday: number;
    emailsSentToday: number;
    averageScore: number;
    topSources: { source: string; count: number }[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [dropsToday, emailsToday, avgScore, sources] = await Promise.all([
      // Total drops today
      db.select({ count: sql`count(*)` })
        .from(dailyDrops)
        .where(sql`${dailyDrops.dropDate} >= ${today}`),
      
      // Emails sent today
      db.select({ count: sql`count(*)` })
        .from(dailyDrops)
        .where(and(
          sql`${dailyDrops.dropDate} >= ${today}`,
          eq(dailyDrops.emailSent, true)
        )),
      
      // Average match score
      db.select({ avg: sql`avg(${dailyDrops.matchScore})` })
        .from(dailyDrops)
        .where(sql`${dailyDrops.dropDate} >= ${today}`),
      
      // Top sources
      db.select({
        source: content.source,
        count: sql`count(*)`
      })
        .from(dailyDrops)
        .innerJoin(content, eq(dailyDrops.contentId, sql`${content.id}::uuid`))
        .where(sql`${dailyDrops.dropDate} >= ${today}`)
        .groupBy(content.source)
        .orderBy(sql`count(*) DESC`)
        .limit(5)
    ]);

    return {
      totalDropsToday: Number(dropsToday[0].count),
      emailsSentToday: Number(emailsToday[0].count),
      averageScore: Number(avgScore[0].avg) || 0,
      topSources: sources.map(s => ({
        source: s.source,
        count: Number(s.count)
      })),
    };
  }
}

export const dailyDropService = new DailyDropService();