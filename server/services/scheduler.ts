import cron from "node-cron";
import { ingestionService } from "./ingestion";
import { dailyDropService } from "./daily-drop";

/**
 * Scheduler service for automated tasks
 */
export class SchedulerService {
  private static instance: SchedulerService;
  private isRunning = false;
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  private constructor() {}

  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Start all scheduled tasks
   */
  start(): void {
    if (this.isRunning) {
      console.log('📅 Scheduler already running');
      return;
    }

    console.log('🚀 Starting scheduler service');

    // Daily content ingestion at 3:00 AM
    const ingestionTask = cron.schedule('0 3 * * *', async () => {
      console.log('🌅 Starting scheduled content ingestion at 3:00 AM');
      try {
        await ingestionService.runDailyIngestion();
        console.log('✅ Scheduled ingestion completed successfully');
      } catch (error) {
        console.error('❌ Scheduled ingestion failed:', error);
      }
    }, {
      timezone: 'UTC',
    });

    // Daily drop generation and email sending at 7:00 AM
    const dailyDropTask = cron.schedule('0 7 * * *', async () => {
      console.log('📧 Starting scheduled daily drop generation at 7:00 AM');
      try {
        await dailyDropService.generateAndSendDailyDrops();
        console.log('✅ Scheduled daily drops completed successfully');
      } catch (error) {
        console.error('❌ Scheduled daily drops failed:', error);
      }
    }, {
      timezone: 'UTC',
    });

    // Store tasks for management
    this.tasks.set('ingestion', ingestionTask);
    this.tasks.set('dailyDrop', dailyDropTask);

    // Start tasks
    ingestionTask.start();
    dailyDropTask.start();

    this.isRunning = true;
    console.log('✅ Scheduler started with tasks:');
    console.log('  - Content ingestion: Daily at 3:00 AM UTC');
    console.log('  - Daily drops: Daily at 7:00 AM UTC');
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('📅 Scheduler not running');
      return;
    }

    console.log('🛑 Stopping scheduler service');

    this.tasks.forEach((task, name) => {
      task.stop();
      console.log(`  - Stopped ${name} task`);
    });

    this.isRunning = false;
    console.log('✅ Scheduler stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    tasks: { name: string; isRunning: boolean; nextRun?: string }[];
  } {
    const taskStatus = Array.from(this.tasks.entries()).map(([name, task]) => ({
      name,
      isRunning: task.running,
      nextRun: task.getStatus(),
    }));

    return {
      isRunning: this.isRunning,
      tasks: taskStatus,
    };
  }

  /**
   * Run ingestion manually (for testing)
   */
  async runIngestionNow(): Promise<void> {
    console.log('🔄 Running manual content ingestion');
    try {
      await ingestionService.runDailyIngestion();
      console.log('✅ Manual ingestion completed');
    } catch (error) {
      console.error('❌ Manual ingestion failed:', error);
      throw error;
    }
  }

  /**
   * Run daily drop generation manually (for testing)
   */
  async runDailyDropsNow(): Promise<void> {
    console.log('📧 Running manual daily drop generation');
    try {
      await dailyDropService.generateAndSendDailyDrops();
      console.log('✅ Manual daily drops completed');
    } catch (error) {
      console.error('❌ Manual daily drops failed:', error);
      throw error;
    }
  }

  /**
   * Run test ingestion for a single feed
   */
  async testFeedIngestion(feedUrl: string): Promise<void> {
    console.log(`🧪 Testing ingestion for feed: ${feedUrl}`);
    try {
      await ingestionService.ingestSingleFeed(feedUrl);
      console.log('✅ Test ingestion completed');
    } catch (error) {
      console.error('❌ Test ingestion failed:', error);
      throw error;
    }
  }

  /**
   * Schedule a one-time task for development/testing
   */
  scheduleOneTime(name: string, cronExpression: string, task: () => Promise<void>): void {
    const scheduledTask = cron.schedule(cronExpression, async () => {
      console.log(`🕐 Running one-time task: ${name}`);
      try {
        await task();
        console.log(`✅ One-time task completed: ${name}`);
        // Auto-destroy after execution
        scheduledTask.stop();
        this.tasks.delete(name);
      } catch (error) {
        console.error(`❌ One-time task failed: ${name}`, error);
      }
    }, {
      timezone: 'UTC',
    });

    this.tasks.set(name, scheduledTask);
    console.log(`📅 Scheduled one-time task: ${name} at ${cronExpression}`);
  }
}

export const schedulerService = SchedulerService.getInstance();