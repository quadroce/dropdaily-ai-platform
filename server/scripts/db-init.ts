#!/usr/bin/env tsx
/**
 * Database initialization script
 * Ensures database schema is created and migrations are run before application starts
 */
import { execSync } from 'child_process';
import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function initializeDatabase(): Promise<void> {
  console.log('🗄️ Initializing database...');
  
  try {
    // Check database connection
    console.log('📡 Testing database connection...');
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection successful');
    
    // Check if tables exist
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    const requiredTables = [
      'users', 'topics', 'content', 'user_preferences', 
      'daily_drops', 'content_topics', 'user_submissions',
      'user_profile_vectors', 'feeds'
    ];
    
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log(`🔧 Missing tables detected: ${missingTables.join(', ')}`);
      console.log('⚡ Running database migrations...');
      
      try {
        // Run drizzle migrations
        execSync('npx drizzle-kit push --force', { 
          stdio: 'inherit',
          env: process.env
        });
        console.log('✅ Database migrations completed');
      } catch (migrationError) {
        console.error('❌ Migration failed:', migrationError);
        throw new Error('Database migration failed');
      }
    } else {
      console.log('✅ All required tables exist');
    }
    
    // Verify all required tables now exist
    const finalTablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const finalTables = finalTablesResult.rows.map(row => row.table_name);
    const stillMissing = requiredTables.filter(table => !finalTables.includes(table));
    
    if (stillMissing.length > 0) {
      throw new Error(`Critical: Required tables still missing after migration: ${stillMissing.join(', ')}`);
    }
    
    console.log('🎉 Database initialization completed successfully');
    
  } catch (error) {
    console.error('💥 Database initialization failed:', error);
    throw error;
  }
}

/**
 * Graceful error handling for missing database tables
 */
export function handleDatabaseError(error: any): void {
  if (error.message?.includes('does not exist') || error.code === '42P01') {
    console.error('❌ Database table does not exist');
    console.error('🔧 Suggested fixes:');
    console.error('   1. Run: npm run db:push');
    console.error('   2. Ensure DATABASE_URL is properly configured');
    console.error('   3. Check database connection and permissions');
  }
  // Don't exit here when called from main app - let the caller handle it
  throw error;
}

// Allow script to be run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}