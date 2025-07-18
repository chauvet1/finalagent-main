#!/bin/bash

# BahinLink - Deploy to Vercel
echo "🚀 Deploying BahinLink to Vercel"
echo "================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo ""
echo "🎯 Deployment Options:"
echo "1. Deploy Client Portal Only (Recommended for client demo)"
echo "2. Deploy Admin Portal Only"
echo "3. Deploy Both Portals"
echo ""

read -p "Choose option (1-3): " choice

case $choice in
    1)
        echo "🌐 Deploying Client Portal to Vercel..."
        cd client-portal
        
        # Build the project
        echo "🔨 Building client portal..."
        npm run build
        
        # Deploy to Vercel
        echo "🚀 Deploying to Vercel..."
        vercel --prod
        
        echo "✅ Client Portal deployed!"
        echo "🔗 Your client can access it at the URL provided above"
        ;;
    2)
        echo "👨‍💼 Deploying Admin Portal to Vercel..."
        cd admin-portal
        
        # Build the project
        echo "🔨 Building admin portal..."
        npm run build
        
        # Deploy to Vercel
        echo "🚀 Deploying to Vercel..."
        vercel --prod
        
        echo "✅ Admin Portal deployed!"
        ;;
    3)
        echo "🌐 Deploying Both Portals to Vercel..."
        
        # Deploy Client Portal
        echo "📱 Deploying Client Portal..."
        cd client-portal
        npm run build
        vercel --prod --name bahinlink-client
        cd ..
        
        # Deploy Admin Portal
        echo "👨‍💼 Deploying Admin Portal..."
        cd admin-portal
        npm run build
        vercel --prod --name bahinlink-admin
        cd ..
        
        echo "✅ Both portals deployed!"
        ;;
    *)
        echo "❌ Invalid option selected"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment Complete!"
echo "📋 Next Steps:"
echo "   1. Share the Vercel URL with your client"
echo "   2. Update environment variables if needed"
echo "   3. Configure custom domain (optional)"
echo ""
echo "💡 Tips:"
echo "   - The client portal has a beautiful landing page"
echo "   - Clients can sign up and access their dashboard"
echo "   - Admin users can access both portals"
echo ""
