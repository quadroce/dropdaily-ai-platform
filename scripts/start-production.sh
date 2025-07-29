#!/bin/bash

# Production startup script for DropDaily
# Ensures database is ready before starting the application

set -e

echo "🚀 Starting DropDaily production deployment..."

# Set production environment
export NODE_ENV=production

# Verify database connection
echo "🔍 Checking database connection..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

# Push database schema if needed
echo "📊 Pushing database schema..."
npm run db:push

# Start the application
echo "🌟 Starting application server..."
exec npm start