#!/bin/bash

# BahinLink Deployment Script
# Builds and pushes all changes to the repository

set -e  # Exit on any error

echo "🚀 Starting BahinLink deployment process..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Found uncommitted changes. Staging all files..."
    git add .
else
    echo "✅ No uncommitted changes found"
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Build client portal
echo "🔨 Building client portal..."
cd client-portal
if npm run build; then
    echo "✅ Client portal build successful"
else
    echo "❌ Client portal build failed"
    exit 1
fi
cd ..

# Build admin portal
echo "🔨 Building admin portal..."
cd admin-portal
if npm run build; then
    echo "✅ Admin portal build successful"
else
    echo "❌ Admin portal build failed"
    exit 1
fi
cd ..

# Build backend (if needed)
echo "🔨 Building backend..."
cd backend
if npm run build; then
    echo "✅ Backend build successful"
else
    echo "❌ Backend build failed"
    exit 1
fi
cd ..

# Stage any new build files
echo "📦 Staging build artifacts..."
git add .

# Check if there are changes to commit
if [ -n "$(git status --porcelain)" ]; then
    # Get commit message
    COMMIT_MSG="🚀 Deploy: Fix hardcoded localhost URLs and implement environment-aware configuration

- ✅ Fixed hardcoded localhost URLs in navigation
- ✅ Implemented centralized environment configuration
- ✅ Added dynamic URL resolution for dev/prod environments
- ✅ Updated Vercel configuration with correct domain
- ✅ Added comprehensive environment testing
- ✅ Implemented circuit breaker for dashboard loading
- ✅ Fixed infinite loop issues in client portal
- ✅ Added missing /client-portal/analytics endpoint
- 📚 Added comprehensive environment setup documentation

Environment URLs now work correctly:
- Development: localhost with standard ports
- Production: Auto-detects current domain (finalagent-main-eywj.vercel.app)

Ready for production deployment to Vercel."

    echo "💾 Committing changes..."
    git commit -m "$COMMIT_MSG"
    
    echo "🚀 Pushing to $CURRENT_BRANCH..."
    git push origin $CURRENT_BRANCH
    
    echo "✅ Successfully pushed to repository!"
    echo ""
    echo "🌐 Next steps:"
    echo "1. Vercel will automatically deploy from the repository"
    echo "2. Check deployment status at: https://vercel.com/dashboard"
    echo "3. Test the deployed application at: https://finalagent-main-eywj.vercel.app"
    echo "4. Verify login buttons redirect to correct URLs (not localhost)"
    echo ""
    echo "📋 Environment Configuration:"
    echo "- Client Portal: https://finalagent-main-eywj.vercel.app"
    echo "- Admin Portal: https://finalagent-main-eywj.vercel.app/admin"
    echo "- API: https://finalagent-main-eywj.vercel.app/api"
    
else
    echo "ℹ️  No changes to commit"
    echo "🚀 Pushing any existing commits..."
    git push origin $CURRENT_BRANCH
fi

echo ""
echo "🎉 Deployment process completed successfully!"
echo "🔍 Monitor the deployment at: https://vercel.com/dashboard"
