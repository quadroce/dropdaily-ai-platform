#!/bin/bash
# Deployment setup script for DropDaily
# Ensures proper build and file structure for production

echo "🚀 Preparing DropDaily for deployment..."

# Build the application
echo "📦 Building application..."
npm run build

# Ensure server/public directory exists and copy built files
echo "📁 Setting up production static files..."
mkdir -p server/public
cp -r dist/public/* server/public/

# Verify files exist
if [ -f "server/public/index.html" ]; then
    echo "✅ Static files copied successfully"
else
    echo "❌ Failed to copy static files"
    exit 1
fi

# Verify server build exists
if [ -f "dist/index.js" ]; then
    echo "✅ Server build completed"
else
    echo "❌ Server build failed"
    exit 1
fi

echo "🎉 Deployment setup completed successfully!"
echo "🚀 Ready to deploy with: npm start"