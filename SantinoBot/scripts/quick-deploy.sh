#!/bin/bash
# Quick Deploy - Choose Your Platform

clear
echo "╔══════════════════════════════════════════════════╗"
echo "║   🚀 Santino Bot - Quick Deploy                 ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Verify configuration first
if [ ! -f .env ]; then
    echo "❌ No .env file found!"
    echo ""
    echo "Please run setup first:"
    echo "  npm run setup:interactive"
    echo ""
    exit 1
fi

# Verify config is valid
echo "🔍 Checking configuration..."
node test-env.js
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Configuration has errors!"
    echo "Fix them before deploying."
    exit 1
fi

echo ""
echo "✅ Configuration valid!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Choose your hosting platform:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1) 🌟 Railway (Recommended - Easy, Free Tier)"
echo "  2) 🎨 Render (Free Tier, Auto-deploy)"
echo "  3) 🖥️  VPS (DigitalOcean, Linode, etc.)"
echo "  4) 🐳 Docker (Local or Cloud)"
echo "  5) 📚 Just show me the guide"
echo "  6) ❌ Cancel"
echo ""
read -p "Enter choice [1-6]: " choice

case $choice in
    1)
        echo ""
        echo "🌟 Deploying to Railway..."
        echo ""
        bash scripts/deploy-railway.sh
        ;;
    2)
        echo ""
        echo "🎨 Deploying to Render..."
        echo ""
        echo "📋 Steps for Render:"
        echo "1. Go to https://render.com"
        echo "2. Create new Web Service"
        echo "3. Connect your GitHub repository"
        echo "4. Add environment variables from .env"
        echo "5. Deploy!"
        echo ""
        echo "📚 See DEPLOY_GUIDE.md for detailed instructions"
        ;;
    3)
        echo ""
        echo "🖥️  Deploying to VPS..."
        echo ""
        bash scripts/deploy-vps.sh
        ;;
    4)
        echo ""
        echo "🐳 Docker Deployment..."
        echo ""
        echo "Building Docker image..."
        docker build -t santino-bot .
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Image built successfully!"
            echo ""
            echo "To run locally:"
            echo "  docker run -d --name santino-bot --env-file .env santino-bot"
            echo ""
            echo "To push to registry:"
            echo "  docker tag santino-bot YOUR_REGISTRY/santino-bot"
            echo "  docker push YOUR_REGISTRY/santino-bot"
            echo ""
        else
            echo "❌ Docker build failed"
            echo "Make sure Docker is installed and running"
        fi
        ;;
    5)
        echo ""
        echo "📚 Opening deployment guide..."
        cat DEPLOY_GUIDE.md | less
        ;;
    6)
        echo ""
        echo "❌ Deployment cancelled"
        exit 0
        ;;
    *)
        echo ""
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 For detailed instructions, see:"
echo "   DEPLOY_GUIDE.md"
echo ""
echo "🐛 Having issues? See:"
echo "   TROUBLESHOOTING.md"
echo ""
echo "✅ After deployment, verify:"
echo "   • Bot responds to /status in group"
echo "   • Free users can only send text"
echo "   • Premium users can send media"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
