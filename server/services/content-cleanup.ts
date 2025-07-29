import { db } from '../db';
import { content, contentTopics } from '../../shared/schema';
import { lt, inArray, sql } from 'drizzle-orm';

interface CleanupConfig {
  retentionDays: number;
  batchSize: number;
  keepBookmarkedContent: boolean;
}

export class ContentCleanupService {
  private config: CleanupConfig = {
    retentionDays: 90, // Mantieni contenuti per 90 giorni
    batchSize: 1000,   // Elimina in batch di 1000
    keepBookmarkedContent: true
  };

  constructor(config?: Partial<CleanupConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Elimina contenuti vecchi mantenendo quelli bookmarkati
   */
  async cleanupOldContent(): Promise<{
    deletedCount: number;
    retainedCount: number;
    errors: string[];
  }> {
    const results = {
      deletedCount: 0,
      retainedCount: 0,
      errors: [] as string[]
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      console.log(`🧹 Starting cleanup of content older than ${cutoffDate.toISOString()}`);

      // Prima conta i contenuti da eliminare
      const oldContentQuery = db
        .select({ id: content.id })
        .from(content)
        .where(lt(content.createdAt, cutoffDate));

      if (this.config.keepBookmarkedContent) {
        // TODO: Aggiungere LEFT JOIN con tabella bookmarks quando implementata
        // Per ora eliminiamo tutti i contenuti vecchi
      }

      const oldContentIds = await oldContentQuery;
      console.log(`📊 Found ${oldContentIds.length} old articles to process`);

      // Elimina in batch per evitare timeout
      let processed = 0;
      while (processed < oldContentIds.length) {
        const batch = oldContentIds.slice(processed, processed + this.config.batchSize);
        const batchIds = batch.map(item => item.id);

        try {
          // Prima elimina le classificazioni associate
          await db
            .delete(contentTopics)
            .where(inArray(contentTopics.content_id, batchIds));

          // Poi elimina i contenuti
          await db
            .delete(content)
            .where(inArray(content.id, batchIds));

          results.deletedCount += batch.length;
          processed += batch.length;

          console.log(`✅ Processed batch: ${processed}/${oldContentIds.length}`);
          
          // Piccola pausa tra i batch per non sovraccaricare il database
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`❌ Error processing batch at position ${processed}:`, error);
          results.errors.push(`Batch error at ${processed}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          processed += batch.length; // Continua anche se un batch fallisce
        }
      }

      console.log(`🎉 Cleanup completed: ${results.deletedCount} articles deleted`);
      
    } catch (error) {
      console.error('❌ Cleanup process failed:', error);
      results.errors.push(`General cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return results;
  }

  /**
   * Analizza le statistiche di utilizzo dello storage
   */
  async getStorageStats(): Promise<{
    totalArticles: number;
    sizeByAge: {
      last7Days: number;
      last30Days: number;
      last90Days: number;
      older: number;
    };
    tableSize: string;
    recommendedAction: string;
  }> {
    try {
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const statsQuery = await db.execute(sql`
        SELECT 
          COUNT(*)::text as total_articles,
          COUNT(*) FILTER (WHERE created_at > ${last7Days})::text as last_7_days,
          COUNT(*) FILTER (WHERE created_at > ${last30Days})::text as last_30_days,
          COUNT(*) FILTER (WHERE created_at > ${last90Days})::text as last_90_days,
          COUNT(*) FILTER (WHERE created_at <= ${last90Days})::text as older_than_90_days,
          pg_size_pretty(pg_total_relation_size('content'))::text as table_size
        FROM content
      `);

      const result = statsQuery.rows?.[0] || statsQuery[0];
      
      let recommendedAction = "Sistema stabile";
      if (result.total_articles > 50000) {
        recommendedAction = "Cleanup urgente raccomandato";
      } else if (result.total_articles > 20000) {
        recommendedAction = "Cleanup raccomandato";
      } else if (result.older_than_90_days > 5000) {
        recommendedAction = "Cleanup contenuti vecchi raccomandato";
      }

      return {
        totalArticles: parseInt(result?.total_articles || '0'),
        sizeByAge: {
          last7Days: parseInt(result?.last_7_days || '0'),
          last30Days: parseInt(result?.last_30_days || '0'),
          last90Days: parseInt(result?.last_90_days || '0'),
          older: parseInt(result?.older_than_90_days || '0')
        },
        tableSize: result?.table_size || '0 bytes',
        recommendedAction
      };

    } catch (error) {
      console.error('Error getting storage stats:', error);
      throw error;
    }
  }

  /**
   * Schedula cleanup automatico (da chiamare con cron job)
   */
  async scheduleCleanup(): Promise<void> {
    console.log('🕒 Starting scheduled content cleanup...');
    
    const stats = await this.getStorageStats();
    console.log(`📊 Current stats: ${stats.totalArticles} total articles, ${stats.tableSize}`);

    // Esegui cleanup solo se necessario
    if (stats.totalArticles > 10000 || stats.sizeByAge.older > 2000) {
      const result = await this.cleanupOldContent();
      console.log(`✅ Scheduled cleanup completed: ${result.deletedCount} articles removed`);
    } else {
      console.log('ℹ️ No cleanup needed at this time');
    }
  }
}

// Istanza globale del servizio
export const contentCleanup = new ContentCleanupService();