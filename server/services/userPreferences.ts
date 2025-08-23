import { db } from "../db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { userPreferences, topics } from "../schema"; // adatta il path
import { z } from "zod";

const PrefSchema = z.object({
  topicId: z.string().uuid().optional(),
  topicSlug: z.string().min(1).optional(),
  weight: z.number().min(0).max(1).optional().default(1),
});
export type IncomingPref = z.infer<typeof PrefSchema>;

export async function saveUserPreferences(userId: string, rawPrefs: IncomingPref[]) {
  const prefs = rawPrefs.map(p => PrefSchema.parse(p));

  const slugs = Array.from(new Set(
    prefs.filter(p => !p.topicId && p.topicSlug).map(p => p.topicSlug!.toLowerCase())
  ));

  let slugToId = new Map<string, string>();
  if (slugs.length) {
    const rows = await db
      .select({ id: topics.id, slug: topics.slug })
      .from(topics)
      .where(inArray(sql`lower(${topics.slug})`, slugs));
    slugToId = new Map(rows.map(r => [r.slug.toLowerCase(), r.id]));
  }

  const rows = prefs
    .map(p => {
      const tid = p.topicId ?? (p.topicSlug ? slugToId.get(p.topicSlug.toLowerCase()) : undefined);
      if (!tid) return null; // niente insert senza topic_id
      return { userId, topicId: tid, weight: p.weight ?? 1 };
    })
    .filter(Boolean) as Array<{ userId: string; topicId: string; weight: number }>;

  if (rows.length === 0) {
    throw new Error("No valid topics provided (topicId or topicSlug).");
  }

  // upsert atomico: sostituisci l’insieme corrente
  await db.transaction(async (tx) => {
    await tx.delete(userPreferences).where(eq(userPreferences.userId, userId));
    await tx.insert(userPreferences).values(rows);
  });

  return { saved: rows.length };
}
