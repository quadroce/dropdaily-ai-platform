#!/bin/bash

# Deployment setup script for DropDaily
# This script ensures the database is properly configured before starting the application

set -e  # Exit on any error

echo "🚀 Starting DropDaily deployment setup..."

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please configure your database connection string"
    exit 1
fi

echo "✅ Environment variables validated"

# Ensure database schema is up to date
echo "🗄️ Running database migrations..."
npx drizzle-kit push --force

echo "🔍 Verifying database tables..."
node -e "
const { db } = require('./server/db.ts');
const { sql } = require('drizzle-orm');

(async () => {
  try {
    const result = await db.execute(sql\`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'\`);
    const tables = result.rows.map(row => row.table_name);
    const requiredTables = ['users', 'topics', 'content', 'user_preferences', 'daily_drops', 'content_topics', 'user_submissions', 'user_profile_vectors', 'feeds'];
    const missing = requiredTables.filter(table => !tables.includes(table));
    
    if (missing.length > 0) {
      console.error('❌ Missing tables:', missing.join(', '));
      process.exit(1);
    }
    
    console.log('✅ All required database tables exist');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    process.exit(1);
  }
})();
"

echo "🎯 Database setup completed successfully"
echo "🚀 Ready to start DropDaily application"