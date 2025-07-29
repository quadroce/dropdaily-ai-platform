#!/bin/bash

# Build script that ensures database migrations are included in deployment
set -e  # Exit on any error

echo "🔧 Building DropDaily with database migrations..."

# Ensure we have a clean environment
echo "🧹 Cleaning previous builds..."
rm -rf dist/

# Run database migrations to ensure schema is current
echo "🗄️ Synchronizing database schema..."
if [ -n "$DATABASE_URL" ]; then
    npx drizzle-kit push --force
    echo "✅ Database schema synchronized"
else
    echo "⚠️ DATABASE_URL not set, skipping migration check"
fi

# Build the frontend
echo "🎨 Building frontend..."
npm run check
vite build

# Build the backend
echo "⚙️ Building backend..."
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Copy migration files to dist
echo "📦 Copying migration files..."
mkdir -p dist/migrations
cp -r migrations/* dist/migrations/ 2>/dev/null || echo "No migration files to copy"

# Copy schema files
mkdir -p dist/shared
cp shared/schema.ts dist/shared/ 2>/dev/null || echo "No schema files to copy"

echo "✅ Build completed successfully!"
echo "📁 Build artifacts:"
echo "   - Frontend: dist/public/"
echo "   - Backend: dist/index.js"
echo "   - Migrations: dist/migrations/"
echo "   - Schema: dist/shared/"

echo ""
echo "🚀 To deploy, run: NODE_ENV=production node dist/index.js"