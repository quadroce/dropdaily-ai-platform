import cron from 'node-cron';
import { contentCleanup } from '../services/content-cleanup';

/**
 * Setup automatic content cleanup scheduling
 * This script configures automated database maintenance tasks
 */
export function setupCleanupCron() {
  console.log('🕒 Setting up content cleanup cron jobs...');

  // Run cleanup every day at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Running scheduled content cleanup...');
    try {
      await contentCleanup.scheduleCleanup();
      console.log('✅ Scheduled cleanup completed successfully');
    } catch (error) {
      console.error('❌ Scheduled cleanup failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Europe/Rome" // Adjust to your timezone
  });

  // Log storage stats every 6 hours for monitoring
  cron.schedule('0 */6 * * *', async () => {
    try {
      const stats = await contentCleanup.getStorageStats();
      console.log(`📊 Storage Stats: ${stats.totalArticles} articles, ${stats.tableSize} - ${stats.recommendedAction}`);
      
      // Alert if urgent cleanup needed
      if (stats.recommendedAction.includes('urgente')) {
        console.warn('⚠️ URGENT: Database requires immediate cleanup!');
      }
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
    }
  }, {
    scheduled: true,
    timezone: "Europe/Rome"
  });

  console.log('✅ Content cleanup cron jobs configured:');
  console.log('  - Daily cleanup at 2:00 AM');
  console.log('  - Storage monitoring every 6 hours');
}

// Export the setup function for use in main server
export default setupCleanupCron;