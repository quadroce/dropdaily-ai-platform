import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, desc, sql, inArray, or, like } from "drizzle-orm";
import type { 
  User, InsertUser, Topic, InsertTopic, Content, InsertContent, 
  UserSubmission, InsertUserSubmission, UserPreference, InsertUserPreference,
  DailyDrop, InsertDailyDrop, ContentWithTopics, UserSubmissionWithUser,
  DailyDropWithContent
} from "@shared/schema";
import { 
  users, topics, content, userSubmissions, userPreferences, 
  dailyDrops, contentTopics, userProfileVectors 
} from "@shared/schema";
import { randomUUID } from "crypto";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Topics
  getAllTopics(): Promise<Topic[]>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  getTopicsByIds(ids: string[]): Promise<Topic[]>;

  // User preferences
  getUserPreferences(userId: string): Promise<(UserPreference & { topic: Topic })[]>;
  setUserPreferences(userId: string, topicIds: string[]): Promise<void>;

  // Content management
  getAllContent(limit?: number, offset?: number): Promise<ContentWithTopics[]>;
  getContentById(id: string): Promise<ContentWithTopics | undefined>;
  createContent(contentData: InsertContent): Promise<Content>;
  updateContent(id: string, updates: Partial<Content>): Promise<Content | undefined>;
  searchContent(query: string): Promise<ContentWithTopics[]>;

  // Content topics
  setContentTopics(contentId: string, topicIds: string[], confidences: number[]): Promise<void>;

  // User submissions
  getUserSubmissions(userId: string): Promise<UserSubmission[]>;
  getAllSubmissions(status?: string): Promise<UserSubmissionWithUser[]>;
  createUserSubmission(submission: InsertUserSubmission): Promise<UserSubmission>;
  updateSubmissionStatus(id: string, status: string, moderatedBy?: string, notes?: string): Promise<UserSubmission | undefined>;

  // Daily drops
  getUserDailyDrops(userId: string, date?: string): Promise<DailyDropWithContent[]>;
  createDailyDrop(drop: InsertDailyDrop): Promise<DailyDrop>;
  markDropAsViewed(userId: string, contentId: string): Promise<void>;
  toggleBookmark(userId: string, contentId: string): Promise<void>;

  // Vector operations
  getUserProfileVector(userId: string): Promise<string | undefined>;
  setUserProfileVector(userId: string, embedding: string): Promise<void>;
  findSimilarContent(embedding: string, limit: number, excludeIds?: string[]): Promise<ContentWithTopics[]>;

  // Analytics
  getSystemStats(): Promise<{
    totalContent: number;
    pendingSubmissions: number;
    activeUsers: number;
    dailyMatches: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const newUser = { ...user, id };
    await db.insert(users).values(newUser);
    return newUser as User;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async getAllTopics(): Promise<Topic[]> {
    return await db.select().from(topics).orderBy(topics.name);
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const id = randomUUID();
    const newTopic = { ...topic, id };
    await db.insert(topics).values(newTopic);
    return newTopic as Topic;
  }

  async getTopicsByIds(ids: string[]): Promise<Topic[]> {
    if (ids.length === 0) return [];
    return await db.select().from(topics).where(inArray(topics.id, ids));
  }

  async getUserPreferences(userId: string): Promise<(UserPreference & { topic: Topic })[]> {
    const result = await db
      .select({
        id: userPreferences.id,
        userId: userPreferences.userId,
        topicId: userPreferences.topicId,
        weight: userPreferences.weight,
        createdAt: userPreferences.createdAt,
        topic: topics
      })
      .from(userPreferences)
      .innerJoin(topics, eq(userPreferences.topicId, topics.id))
      .where(eq(userPreferences.userId, userId));
    
    return result;
  }

  async setUserPreferences(userId: string, topicIds: string[]): Promise<void> {
    // Remove existing preferences
    await db.delete(userPreferences).where(eq(userPreferences.userId, userId));
    
    // Add new preferences
    if (topicIds.length > 0) {
      const preferences = topicIds.map(topicId => ({
        id: randomUUID(),
        userId,
        topicId,
        weight: 1.0,
        createdAt: new Date()
      }));
      await db.insert(userPreferences).values(preferences);
    }
  }

  async getAllContent(limit = 50, offset = 0): Promise<ContentWithTopics[]> {
    const contentResult = await db
      .select()
      .from(content)
      .where(eq(content.status, 'approved'))
      .orderBy(desc(content.createdAt))
      .limit(limit)
      .offset(offset);

    const contentWithTopics = await Promise.all(
      contentResult.map(async (c) => {
        const topicsResult = await db
          .select({
            id: topics.id,
            name: topics.name,
            description: topics.description,
            embedding: topics.embedding,
            createdAt: topics.createdAt,
            confidence: contentTopics.confidence
          })
          .from(contentTopics)
          .innerJoin(topics, eq(contentTopics.topicId, topics.id))
          .where(eq(contentTopics.contentId, c.id));

        return {
          ...c,
          topics: topicsResult
        };
      })
    );

    return contentWithTopics;
  }

  async getContentById(id: string): Promise<ContentWithTopics | undefined> {
    const contentResult = await db.select().from(content).where(eq(content.id, id)).limit(1);
    if (!contentResult[0]) return undefined;

    const topicsResult = await db
      .select({
        id: topics.id,
        name: topics.name,
        description: topics.description,
        embedding: topics.embedding,
        createdAt: topics.createdAt,
        confidence: contentTopics.confidence
      })
      .from(contentTopics)
      .innerJoin(topics, eq(contentTopics.topicId, topics.id))
      .where(eq(contentTopics.contentId, id));

    return {
      ...contentResult[0],
      topics: topicsResult
    };
  }

  async createContent(contentData: InsertContent): Promise<Content> {
    const id = randomUUID();
    const newContent = { ...contentData, id };
    await db.insert(content).values(newContent);
    return newContent as Content;
  }

  async updateContent(id: string, updates: Partial<Content>): Promise<Content | undefined> {
    const result = await db.update(content)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(content.id, id))
      .returning();
    return result[0];
  }

  async searchContent(query: string): Promise<ContentWithTopics[]> {
    const contentResult = await db
      .select()
      .from(content)
      .where(
        and(
          eq(content.status, 'approved'),
          or(
            like(content.title, `%${query}%`),
            like(content.description, `%${query}%`)
          )
        )
      )
      .orderBy(desc(content.createdAt))
      .limit(20);

    const contentWithTopics = await Promise.all(
      contentResult.map(async (c) => {
        const topicsResult = await db
          .select({
            id: topics.id,
            name: topics.name,
            description: topics.description,
            embedding: topics.embedding,
            createdAt: topics.createdAt,
            confidence: contentTopics.confidence
          })
          .from(contentTopics)
          .innerJoin(topics, eq(contentTopics.topicId, topics.id))
          .where(eq(contentTopics.contentId, c.id));

        return {
          ...c,
          topics: topicsResult
        };
      })
    );

    return contentWithTopics;
  }

  async setContentTopics(contentId: string, topicIds: string[], confidences: number[]): Promise<void> {
    // Remove existing topic associations
    await db.delete(contentTopics).where(eq(contentTopics.contentId, contentId));
    
    // Add new associations
    if (topicIds.length > 0) {
      const associations = topicIds.map((topicId, index) => ({
        id: randomUUID(),
        contentId,
        topicId,
        confidence: confidences[index] || 0.5,
        createdAt: new Date()
      }));
      await db.insert(contentTopics).values(associations);
    }
  }

  async getUserSubmissions(userId: string): Promise<UserSubmission[]> {
    return await db
      .select()
      .from(userSubmissions)
      .where(eq(userSubmissions.userId, userId))
      .orderBy(desc(userSubmissions.createdAt));
  }

  async getAllSubmissions(status?: string): Promise<UserSubmissionWithUser[]> {
    const query = db
      .select({
        id: userSubmissions.id,
        userId: userSubmissions.userId,
        url: userSubmissions.url,
        title: userSubmissions.title,
        description: userSubmissions.description,
        suggestedTopics: userSubmissions.suggestedTopics,
        status: userSubmissions.status,
        moderatedBy: userSubmissions.moderatedBy,
        moderationNotes: userSubmissions.moderationNotes,
        contentId: userSubmissions.contentId,
        createdAt: userSubmissions.createdAt,
        updatedAt: userSubmissions.updatedAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        }
      })
      .from(userSubmissions)
      .innerJoin(users, eq(userSubmissions.userId, users.id));

    if (status) {
      query.where(eq(userSubmissions.status, status as any));
    }

    return await query.orderBy(desc(userSubmissions.createdAt));
  }

  async createUserSubmission(submission: InsertUserSubmission): Promise<UserSubmission> {
    const id = randomUUID();
    const newSubmission = { ...submission, id };
    await db.insert(userSubmissions).values(newSubmission);
    return newSubmission as UserSubmission;
  }

  async updateSubmissionStatus(
    id: string, 
    status: string, 
    moderatedBy?: string, 
    notes?: string
  ): Promise<UserSubmission | undefined> {
    const result = await db.update(userSubmissions)
      .set({ 
        status: status as any, 
        moderatedBy, 
        moderationNotes: notes,
        updatedAt: new Date()
      })
      .where(eq(userSubmissions.id, id))
      .returning();
    return result[0];
  }

  async getUserDailyDrops(userId: string, date?: string): Promise<DailyDropWithContent[]> {
    let query = db
      .select({
        id: dailyDrops.id,
        userId: dailyDrops.userId,
        contentId: dailyDrops.contentId,
        dropDate: dailyDrops.dropDate,
        matchScore: dailyDrops.matchScore,
        wasViewed: dailyDrops.wasViewed,
        wasBookmarked: dailyDrops.wasBookmarked,
        createdAt: dailyDrops.createdAt,
        content: content
      })
      .from(dailyDrops)
      .innerJoin(content, eq(dailyDrops.contentId, content.id))
      .where(eq(dailyDrops.userId, userId));

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query = db
        .select({
          id: dailyDrops.id,
          userId: dailyDrops.userId,
          contentId: dailyDrops.contentId,
          dropDate: dailyDrops.dropDate,
          matchScore: dailyDrops.matchScore,
          wasViewed: dailyDrops.wasViewed,
          wasBookmarked: dailyDrops.wasBookmarked,
          createdAt: dailyDrops.createdAt,
          content: content
        })
        .from(dailyDrops)
        .innerJoin(content, eq(dailyDrops.contentId, content.id))
        .where(
          and(
            eq(dailyDrops.userId, userId),
            sql`${dailyDrops.dropDate} >= ${startDate}`,
            sql`${dailyDrops.dropDate} < ${endDate}`
          )
        );
    }

    const result = await query.orderBy(desc(dailyDrops.matchScore), desc(dailyDrops.dropDate));

    // Add topics to each content item
    const dropsWithContentAndTopics = await Promise.all(
      result.map(async (drop) => {
        const topicsResult = await db
          .select({
            id: topics.id,
            name: topics.name,
            description: topics.description,
            embedding: topics.embedding,
            createdAt: topics.createdAt,
            confidence: contentTopics.confidence
          })
          .from(contentTopics)
          .innerJoin(topics, eq(contentTopics.topicId, topics.id))
          .where(eq(contentTopics.contentId, drop.content.id));

        return {
          ...drop,
          content: {
            ...drop.content,
            topics: topicsResult
          }
        };
      })
    );

    return dropsWithContentAndTopics;
  }

  async createDailyDrop(drop: InsertDailyDrop): Promise<DailyDrop> {
    const id = randomUUID();
    const newDrop = { ...drop, id };
    await db.insert(dailyDrops).values(newDrop);
    return newDrop as DailyDrop;
  }

  async markDropAsViewed(userId: string, contentId: string): Promise<void> {
    await db.update(dailyDrops)
      .set({ wasViewed: true })
      .where(
        and(
          eq(dailyDrops.userId, userId),
          eq(dailyDrops.contentId, contentId)
        )
      );
  }

  async toggleBookmark(userId: string, contentId: string): Promise<void> {
    const existing = await db.select()
      .from(dailyDrops)
      .where(
        and(
          eq(dailyDrops.userId, userId),
          eq(dailyDrops.contentId, contentId)
        )
      )
      .limit(1);

    if (existing[0]) {
      await db.update(dailyDrops)
        .set({ wasBookmarked: !existing[0].wasBookmarked })
        .where(
          and(
            eq(dailyDrops.userId, userId),
            eq(dailyDrops.contentId, contentId)
          )
        );
    }
  }

  async getUserProfileVector(userId: string): Promise<string | undefined> {
    const result = await db.select()
      .from(userProfileVectors)
      .where(eq(userProfileVectors.userId, userId))
      .limit(1);
    return result[0]?.embedding;
  }

  async setUserProfileVector(userId: string, embedding: string): Promise<void> {
    const existing = await db.select()
      .from(userProfileVectors)
      .where(eq(userProfileVectors.userId, userId))
      .limit(1);

    if (existing[0]) {
      await db.update(userProfileVectors)
        .set({ embedding, updatedAt: new Date() })
        .where(eq(userProfileVectors.userId, userId));
    } else {
      await db.insert(userProfileVectors).values({
        id: randomUUID(),
        userId,
        embedding,
        updatedAt: new Date()
      });
    }
  }

  async findSimilarContent(embedding: string, limit: number, excludeIds?: string[]): Promise<ContentWithTopics[]> {
    // This is a simplified version - in production, you'd use pgvector's similarity operators
    // For now, return random approved content
    let query = db
      .select()
      .from(content)
      .where(eq(content.status, 'approved'))
      .orderBy(desc(content.createdAt))
      .limit(limit);

    if (excludeIds && excludeIds.length > 0) {
      query = db
        .select()
        .from(content)
        .where(
          and(
            eq(content.status, 'approved'),
            sql`${content.id} NOT IN ${excludeIds}`
          )
        )
        .orderBy(desc(content.createdAt))
        .limit(limit);
    }

    const contentResult = await query;

    const contentWithTopics = await Promise.all(
      contentResult.map(async (c) => {
        const topicsResult = await db
          .select({
            id: topics.id,
            name: topics.name,
            description: topics.description,
            embedding: topics.embedding,
            createdAt: topics.createdAt,
            confidence: contentTopics.confidence
          })
          .from(contentTopics)
          .innerJoin(topics, eq(contentTopics.topicId, topics.id))
          .where(eq(contentTopics.contentId, c.id));

        return {
          ...c,
          topics: topicsResult
        };
      })
    );

    return contentWithTopics;
  }

  async getSystemStats(): Promise<{
    totalContent: number;
    pendingSubmissions: number;
    activeUsers: number;
    dailyMatches: number;
  }> {
    const [contentCount] = await db.select({ count: sql<number>`count(*)` }).from(content);
    const [submissionCount] = await db.select({ count: sql<number>`count(*)` }).from(userSubmissions).where(eq(userSubmissions.status, 'pending'));
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isOnboarded, true));
    const [dropCount] = await db.select({ count: sql<number>`count(*)` }).from(dailyDrops);

    return {
      totalContent: contentCount.count,
      pendingSubmissions: submissionCount.count,
      activeUsers: userCount.count,
      dailyMatches: dropCount.count
    };
  }
}

export const storage = new DatabaseStorage();
