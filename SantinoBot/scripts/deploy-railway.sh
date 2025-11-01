#!/bin/bash
# Railway Deployment Helper

echo "🚂 Railway Deployment Helper"
echo "=============================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit for Railway deployment"
else
    echo "✅ Git repository already initialized"
fi

echo ""
echo "📋 Pre-deployment Checklist:"
echo "=============================="
echo ""

# Check .env exists
if [ -f .env ]; then
    echo "✅ .env file exists"
    
    # Extract values for user to copy
    echo ""
    echo "📝 Copy these values to Railway dashboard:"
    echo "==========================================="
    echo ""
    
    # Show env vars (hiding sensitive parts)
    while IFS='=' read -r key value; do
        if [[ ! $key =~ ^# ]] && [ -n "$key" ]; then
            if [[ $key == "FIREBASE_PRIVATE_KEY" ]]; then
                echo "$key=<your_private_key_with_\\n>"
            elif [[ $key == "BOT_TOKEN" ]]; then
                echo "$key=${value:0:10}..."
            else
                echo "$key=$value"
            fi
        fi
    done < .env
else
    echo "❌ .env file not found!"
    echo "   Run: npm run setup"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. 🌐 Go to https://railway.app"
echo "2. 🔗 Click 'Start a New Project'"
echo "3. 📁 Deploy from GitHub (push your code first)"
echo "4. ⚙️  Add environment variables (shown above)"
echo "5. 🚀 Click Deploy"
echo ""
echo "Need to push to GitHub first?"
echo "  gh repo create SantinoBot --public --source=. --push"
echo ""
echo "OR manually:"
echo "  Create repo on GitHub, then:"
echo "  git remote add origin https://github.com/USERNAME/SantinoBot.git"
echo "  git branch -M main"
echo "  git push -u origin main"
echo ""
