import { Request, Response } from 'express';
import { db } from '../db';
import { content } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Save/unsave an article (protect from cleanup when saved)
 */
export async function toggleBookmark(req: Request, res: Response) {
  try {
    const { contentId } = req.params;
    const { save } = req.body;

    if (!contentId) {
      return res.status(400).json({ error: 'Content ID is required' });
    }

    // Update the content's isSaved status
    const result = await db
      .update(content)
      .set({ 
        isSaved: Boolean(save),
        updatedAt: new Date()
      })
      .where(eq(content.id, contentId))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json({
      success: true,
      message: save ? 'Article saved and protected from cleanup' : 'Article unsaved',
      contentId,
      isSaved: Boolean(save)
    });

  } catch (error) {
    console.error('Error toggling bookmark:', error);
    res.status(500).json({ 
      error: 'Failed to update bookmark status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get all saved/bookmarked articles for a user
 */
export async function getSavedArticles(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const savedArticles = await db
      .select()
      .from(content)
      .where(eq(content.isSaved, true))
      .orderBy(content.updatedAt);

    res.json(savedArticles);

  } catch (error) {
    console.error('Error fetching saved articles:', error);
    res.status(500).json({ 
      error: 'Failed to fetch saved articles',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}