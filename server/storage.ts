// server/storage.ts
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, desc, sql, or, like } from "drizzle-orm";
import type { 
  User, InsertUser, Topic, InsertTopic, Content, InsertContent, 
  UserSubmission, InsertUserSubmission, UserPreference,
  DailyDrop, ContentWithTopics, UserSubmissionWithUser,
  DailyDropWithContent, PasswordResetToken
} from "@shared/schema";
import { 
  users, topics, content, userSubmissions, userPreferences, 
  dailyDrops, contentTopics, userProfileVectors, passwordResetTokens
} from "@shared/schema";
import { randomUUID } from "crypto";

// ♻️ Riusa il client Postgres unico (IPv4-forced) definito in server/db.ts
import { pool as client } from "./db";

export const db = drizzle(client);

// -----------------------------
// Helpers
// -----------------------------
function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function fetchTopicsForContent(contentId: string) {
  const rows = await db
    .select({
      id: topics.id,
      name: topics.name,
      description: topics.description,
      embedding: topics.embedding,
      confidence: contentTopics.confidence,
      createdAt: topics.createdAt,
    })
    .from(contentTopics)
    .innerJoin(topics, eq(contentTopics.topicId, topics.id))
    .where(eq(contentTopics.contentId, contentId));
  return rows;
}

// -----------------------------
// Storage implementation
// -----------------------------
export class DatabaseStorage {

  // ===== Users =====
  async createUser(data: InsertUser): Promise<User> {
    const [row] = await db.insert(users).values({
      ...data,
      email: normalizeEmail(data.email),
    }).returning();
    return row;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [row] = await db.select().from(users)
      .where(eq(users.email, normalizeEmail(email)))
      .limit(1);
    return row ?? null;
  }

  async updateUser(id: string, patch: Partial<User>): Promise<User | null> {
    if (patch.email) patch.email = normalizeEmail(patch.email);
    const [row] = await db.update(users)
      .set({ ...patch, updatedAt: sql`now()` })
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  }

  // ===== User preferences (topics) =====
  async getUserPreferences(userId: string): Promise<Array<UserPreference & { topic: Topic }>> {
    const rows = await db
      .select({
        id: userPreferences.id,
        userId: userPreferences.userId,
        topicId: userPreferences.topicId,
        weight: userPreferences.weight,
        createdAt: userPreferences.createdAt,
        topic: {
          id: topics.id,
          name: topics.name,
          description: topics.description,
          embedding: topics.embedding,
          createdAt: topics.createdAt,
        }
      })
      .from(userPreferences)
      .innerJoin(topics, eq(userPreferences.topicId, topics.id))
      .where(eq(userPreferences.userId, userId))
      .orderBy(desc(userPreferences.createdAt));
    return rows;
  }

  async setUserPreferences(userId: string, prefs: Array<{ topicId: string; weight: number }>): Promise<void> {
    // Replace semplice
    await db.delete(userPreferences).where(eq(userPreferences.userId, userId));
    if (!prefs?.length) return;
    await db.insert(userPreferences).values(
      prefs.map(p => ({
        id: randomUUID(),
        userId,
        topicId: p.topicId,
        weight: p.weight,
      }))
    );
  }

  // ===== Profile vector =====
  async getUserProfileVector(userId: string): Promise<{ embedding: string } | null> {
    const [row] = await db.select().from(userProfileVectors)
      .where(eq(userProfileVectors.userId, userId)).limit(1);
    return row ? { embedding: row.embedding } : null;
  }

  async setUserProfileVector(userId: string, embedding: number[] | string): Promise<void> {
    const payload = Array.isArray(embedding) ? JSON.stringify(embedding) : embedding;
    const exists = await db.select({ id: userProfileVectors.id })
      .from(userProfileVectors)
      .where(eq(userProfileVectors.userId, userId))
      .limit(1);
    if (exists.length) {
      await db.update(userProfileVectors)
        .set({ embedding: payload, updatedAt: sql`now()` })
        .where(eq(userProfileVectors.userId, userId));
    } else {
      await db.insert(userProfileVectors).values({
        id: randomUUID(),
        userId,
        embedding: payload,
      });
    }
  }

  // ===== Topics =====
  async createTopic(data: InsertTopic): Promise<Topic> {
    const [row] = await db.insert(topics).values(data).returning();
    return row;
  }

  async getAllTopics(): Promise<Topic[]> {
    return await db.select().from(topics).orderBy(topics.name);
  }

  // ===== Content =====
  async createContent(data: InsertContent): Promise<Content> {
    const [row] = await db.insert(content).values(data).returning();
    return row;
  }

  async getContentById(id: string): Promise<ContentWithTopics | null> {
    const [c] = await db.select().from(content).where(eq(content.id, id)).limit(1);
    if (!c) return null;
    const t = await fetchTopicsForContent(c.id);
    return { ...(c as Content), topics: t as any };
  }

  async getAllContent(limit = 200): Promise<ContentWithTopics[]> {
    const rows = await db.select().from(content).orderBy(desc(content.createdAt)).limit(limit);
    const result: ContentWithTopics[] = [];
    for (const c of rows) {
      const t = await fetchTopicsForContent(c.id);
      result.push({ ...(c as Content), topics: t as any });
    }
    return result;
  }

  async searchContent(q: string, limit = 50): Promise<ContentWithTopics[]> {
    const term = `%${q}%`;
    const rows = await db.select().from(content)
      .where(or(like(content.title, term), like(content.description, term)))
      .orderBy(desc(content.createdAt))
      .limit(limit);
    const out: ContentWithTopics[] = [];
    for (const c of rows) {
      const t = await fetchTopicsForContent(c.id);
      out.push({ ...(c as Content), topics: t as any });
    }
    return out;
  }

  async setContentTopics(contentId: string, items: Array<{ topicId: string; confidence: number }>): Promise<void> {
    await db.delete(contentTopics).where(eq(contentTopics.contentId, contentId));
    if (!items?.length) return;
    await db.insert(contentTopics).values(
      items.map(i => ({
        id: randomUUID(),
        contentId,
        topicId: i.topicId,
        confidence: i.confidence ?? 0.5,
      }))
    );
  }

  async findSimilarContent(sourceUrl: string, guid?: string, title?: string): Promise<Content[]> {
    // 1) Match esatto per URL o GUID
    const matches = await db.select().from(content)
      .where(or(eq(content.url, sourceUrl), guid ? eq(content.guid, guid) : sql`false` as any))
      .limit(5);
    if (matches.length) return matches;

    // 2) Heuristica per titolo simile (best-effort)
    if (title) {
      const term = `%${title.slice(0, 40)}%`;
      const similar = await db.select().from(content)
        .where(like(content.title, term))
        .orderBy(desc(content.createdAt))
        .limit(5);
      return similar;
    }

    return [];
  }

  // ===== Daily Drops =====
  async createDailyDrop(data: { userId: string; contentId: string; dropDate: Date; matchScore: number }): Promise<DailyDrop> {
    const [row] = await db.insert(dailyDrops).values({
      id: randomUUID(),
      userId: data.userId,
      contentId: data.contentId,
      dropDate: data.dropDate,
      matchScore: data.matchScore,
    }).returning();
    return row;
  }

  async getUserDailyDrops(userId: string, date?: string): Promise<DailyDropWithContent[]> {
    let rows = await db.select().from(dailyDrops)
      .where(eq(dailyDrops.userId, userId))
      .orderBy(desc(dailyDrops.dropDate))
      .limit(200);

    if (date) {
      // filtro per giorno (UTC) dell'ISO passato
      const d = new Date(date);
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59));
      rows = rows.filter(r => {
        const ts = new Date(r.dropDate as any).getTime();
        return ts >= start.getTime() && ts <= end.getTime();
      });
    }

    const results: DailyDropWithContent[] = [];
    for (const dd of rows) {
      const c = await this.getContentById(dd.contentId);
      if (c) results.push({ ...(dd as DailyDrop), content: c } as any);
    }
    return results;
  }

  async markDropAsViewed(userId: string, contentId: string): Promise<void> {
    // segna come visto l'ultimo drop per (user, content)
    const [last] = await db.select().from(dailyDrops)
      .where(and(eq(dailyDrops.userId, userId), eq(dailyDrops.contentId, contentId)))
      .orderBy(desc(dailyDrops.dropDate))
      .limit(1);
    if (!last) return;
    await db.update(dailyDrops)
      .set({ wasViewed: true })
      .where(eq(dailyDrops.id, last.id));
  }

  async toggleBookmark(userId: string, contentId: string): Promise<void> {
    // toggle sul record più recente di daily_drops per (user, content)
    const [last] = await db.select().from(dailyDrops)
      .where(and(eq(dailyDrops.userId, userId), eq(dailyDrops.contentId, contentId)))
      .orderBy(desc(dailyDrops.dropDate))
      .limit(1);
    if (!last) return;
    await db.update(dailyDrops)
      .set({ wasBookmarked: !last.wasBookmarked })
      .where(eq(dailyDrops.id, last.id));
  }

  // ===== Submissions =====
  async createUserSubmission(data: InsertUserSubmission): Promise<UserSubmission> {
    const [row] = await db.insert(userSubmissions).values(data).returning();
    return row;
  }

  async getUserSubmissions(userId: string): Promise<UserSubmission[]> {
    return await db.select().from(userSubmissions)
      .where(eq(userSubmissions.userId, userId))
      .orderBy(desc(userSubmissions.createdAt));
  }

  async getAllSubmissions(status?: "pending" | "approved" | "rejected"): Promise<UserSubmission[]> {
    if (status) {
      return await db.select().from(userSubmissions)
        .where(eq(userSubmissions.status, status))
        .orderBy(desc(userSubmissions.createdAt));
    }
    return await db.select().from(userSubmissions)
      .orderBy(desc(userSubmissions.createdAt));
  }

  async updateSubmissionStatus(id: string, status: "pending" | "approved" | "rejected", moderatedBy?: string, moderationNotes?: string): Promise<UserSubmission | null> {
    const [row] = await db.update(userSubmissions)
      .set({ status, moderatedBy: moderatedBy ?? null, moderationNotes: moderationNotes ?? null, updatedAt: sql`now()` })
      .where(eq(userSubmissions.id, id))
      .returning();
    return row ?? null;
  }

  // ===== Password reset tokens =====
  async createPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [row] = await db.insert(passwordResetTokens)
      .values({ id: randomUUID(), email: normalizeEmail(email), token, expiresAt })
      .returning();
    return row;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    const [row] = await db.select().from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.token, token), eq(passwordResetTokens.used, false)))
      .limit(1);
    return row ?? null;
  }

  async markTokenAsUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  // ===== System stats =====
  async getSystemStats(): Promise<{ totalContent: number; pendingSubmissions: number; activeUsers: number; dailyMatches: number; }> {
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
export default storage;
