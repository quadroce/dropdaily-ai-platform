import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, real, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const contentStatusEnum = pgEnum('content_status', ['pending', 'approved', 'rejected']);
export const submissionStatusEnum = pgEnum('submission_status', ['pending', 'approved', 'rejected']);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default('user'), // 'user' or 'admin'
  isOnboarded: boolean("is_onboarded").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Topics table - predefined content categories
export const topics = pgTable("topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  embedding: text("embedding"), // JSON string of vector
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// User preferences - many-to-many relationship with topics
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  topicId: varchar("topic_id").notNull().references(() => topics.id, { onDelete: 'cascade' }),
  weight: real("weight").notNull().default(1.0), // Preference strength
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// RSS Feeds table
export const feeds = pgTable("feeds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull().unique(),
  tags: text("tags").array(), // Array of tags
  isActive: boolean("is_active").notNull().default(true),
  lastFetched: timestamp("last_fetched"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Content table - all ingested content
export const content = pgTable("content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  feedId: varchar("feed_id").references(() => feeds.id, { onDelete: 'set null' }),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull().unique(),
  source: text("source").notNull(), // 'rss', 'youtube', 'blog', 'article', etc.
  contentType: text("content_type").notNull(), // 'video', 'article', 'podcast'
  duration: integer("duration"), // in minutes for videos/podcasts
  thumbnailUrl: text("thumbnail_url"),
  transcript: text("transcript"),
  summary: text("summary"), // AI-generated summary
  fullContent: text("full_content"), // Full article content if available
  embedding: text("embedding"), // JSON string of vector
  status: contentStatusEnum("status").notNull().default('approved'),
  viewCount: integer("view_count").notNull().default(0),
  publishedAt: timestamp("published_at"), // Original publication date
  guid: text("guid"), // RSS GUID for deduplication
  metadata: jsonb("metadata"), // Additional data like author, publish date, etc.
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Content topics - many-to-many relationship
export const contentTopics = pgTable("content_topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => content.id, { onDelete: 'cascade' }),
  topicId: varchar("topic_id").notNull().references(() => topics.id, { onDelete: 'cascade' }),
  confidence: real("confidence").notNull().default(0.5), // AI classification confidence
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// User submissions
export const userSubmissions = pgTable("user_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  url: text("url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  suggestedTopics: jsonb("suggested_topics"), // Array of topic IDs
  status: submissionStatusEnum("status").notNull().default('pending'),
  moderatedBy: varchar("moderated_by").references(() => users.id),
  moderationNotes: text("moderation_notes"),
  contentId: varchar("content_id").references(() => content.id), // Set when approved
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Daily drops - tracks what content was sent to users
export const dailyDrops = pgTable("daily_drops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  contentId: varchar("content_id").notNull().references(() => content.id, { onDelete: 'cascade' }),
  dropDate: timestamp("drop_date").notNull(),
  matchScore: real("match_score").notNull(), // Similarity score
  wasViewed: boolean("was_viewed").notNull().default(false),
  wasBookmarked: boolean("was_bookmarked").notNull().default(false),
  sentAt: timestamp("sent_at"), // When email was sent
  emailSent: boolean("email_sent").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// User profile vectors - aggregated preference vectors
export const userProfileVectors = pgTable("user_profile_vectors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  embedding: text("embedding").notNull(), // JSON string of aggregated vector
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
  createdAt: true,
});

export const insertUserPreferenceSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
});

export const insertContentSchema = createInsertSchema(content).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSubmissionSchema = createInsertSchema(userSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFeedSchema = createInsertSchema(feeds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyDropSchema = createInsertSchema(dailyDrops).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type Feed = typeof feeds.$inferSelect;
export type InsertFeed = z.infer<typeof insertFeedSchema>;

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;

export type Content = typeof content.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;

export type UserSubmission = typeof userSubmissions.$inferSelect;
export type InsertUserSubmission = z.infer<typeof insertUserSubmissionSchema>;

export type DailyDrop = typeof dailyDrops.$inferSelect;
export type InsertDailyDrop = z.infer<typeof insertDailyDropSchema>;

export type UserProfileVector = typeof userProfileVectors.$inferSelect;

// Extended types for API responses
export type ContentWithTopics = Content & {
  topics: (Topic & { confidence: number })[];
};

export type UserSubmissionWithUser = UserSubmission & {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
};

export type DailyDropWithContent = DailyDrop & {
  content: ContentWithTopics;
};
