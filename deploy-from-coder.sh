#!/bin/bash

# Deploy PNPtv Telegram Bot from Coder to Railway
# This script automates the deployment process

set -e  # Exit on error

echo "🚀 PNPtv Bot - Deploy from Coder to Railway"
echo "============================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file first:"
    echo "  cp .env.example .env"
    echo "  nano .env  # Edit with your credentials"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

echo "✅ Environment variables loaded"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
    echo "✅ Railway CLI installed"
else
    echo "✅ Railway CLI already installed"
fi
echo ""

# Login to Railway
echo "🔐 Logging in to Railway..."
echo "A browser window will open. Please authenticate."
railway login
echo "✅ Logged in to Railway"
echo ""

# Initialize or link project
echo "📋 Setting up Railway project..."
if [ ! -f railway.json ]; then
    echo "Creating new Railway project..."
    railway init
else
    echo "Linking to existing Railway project..."
    railway link
fi
echo "✅ Railway project configured"
echo ""

# Build payment app
echo "🏗️  Building payment app..."
cd payment-app
npm install --quiet
npm run build
cd ..
echo "✅ Payment app built"
echo ""

# Set environment variables in Railway
echo "⚙️  Setting environment variables in Railway..."

# Required variables
railway variables set TELEGRAM_TOKEN="$TELEGRAM_TOKEN" || echo "⚠️  TELEGRAM_TOKEN not set in .env"
railway variables set ADMIN_IDS="$ADMIN_IDS" || echo "⚠️  ADMIN_IDS not set in .env"
railway variables set FIREBASE_PROJECT_ID="$FIREBASE_PROJECT_ID" || echo "⚠️  FIREBASE_PROJECT_ID not set in .env"
railway variables set FIREBASE_CREDENTIALS="$FIREBASE_CREDENTIALS" || echo "⚠️  FIREBASE_CREDENTIALS not set in .env"
railway variables set CHANNEL_ID="$CHANNEL_ID" || echo "⚠️  CHANNEL_ID not set in .env"

# Daimo variables
railway variables set DAIMO_APP_ID="$DAIMO_APP_ID" || echo "⚠️  DAIMO_APP_ID not set in .env"
railway variables set DAIMO_WEBHOOK_TOKEN="$DAIMO_WEBHOOK_TOKEN" || echo "⚠️  DAIMO_WEBHOOK_TOKEN not set in .env"
railway variables set VITE_DAIMO_APP_ID="$VITE_DAIMO_APP_ID" || echo "⚠️  VITE_DAIMO_APP_ID not set in .env"
railway variables set VITE_TREASURY_ADDRESS="$VITE_TREASURY_ADDRESS" || echo "⚠️  VITE_TREASURY_ADDRESS not set in .env"
railway variables set VITE_REFUND_ADDRESS="$VITE_REFUND_ADDRESS" || echo "⚠️  VITE_REFUND_ADDRESS not set in .env"
railway variables set VITE_SETTLEMENT_CHAIN="${VITE_SETTLEMENT_CHAIN:-10}"
railway variables set VITE_SETTLEMENT_TOKEN="${VITE_SETTLEMENT_TOKEN:-0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85}"

# ePayco variables (optional)
if [ ! -z "$EPAYCO_PUBLIC_KEY" ]; then
    railway variables set EPAYCO_PUBLIC_KEY="$EPAYCO_PUBLIC_KEY"
    railway variables set EPAYCO_PRIVATE_KEY="$EPAYCO_PRIVATE_KEY"
    railway variables set EPAYCO_P_CUST_ID="$EPAYCO_P_CUST_ID"
    railway variables set EPAYCO_P_KEY="$EPAYCO_P_KEY"
    railway variables set EPAYCO_TEST_MODE="${EPAYCO_TEST_MODE:-true}"
    echo "✅ ePayco variables set"
fi

# Other variables
railway variables set PORT="3000"
railway variables set NODE_ENV="production"

echo "✅ Environment variables configured"
echo ""

# First deployment (without BOT_URL)
echo "🚀 Initial deployment..."
railway up
echo "✅ Initial deployment complete"
echo ""

# Get Railway domain
echo "🌐 Getting Railway domain..."
RAILWAY_DOMAIN=$(railway domain 2>/dev/null || echo "")

if [ -z "$RAILWAY_DOMAIN" ]; then
    echo "⚠️  Could not get Railway domain automatically"
    echo "Please get your domain manually:"
    echo "  railway domain"
    echo ""
    read -p "Enter your Railway domain (e.g., your-app.up.railway.app): " RAILWAY_DOMAIN
fi

if [ ! -z "$RAILWAY_DOMAIN" ]; then
    # Ensure https://
    if [[ ! "$RAILWAY_DOMAIN" =~ ^https:// ]]; then
        RAILWAY_DOMAIN="https://$RAILWAY_DOMAIN"
    fi

    echo "✅ Railway domain: $RAILWAY_DOMAIN"
    echo ""

    # Update BOT_URL and related variables
    echo "⚙️  Updating URL variables..."
    railway variables set BOT_URL="$RAILWAY_DOMAIN"
    railway variables set PAYMENT_PAGE_URL="$RAILWAY_DOMAIN/pay"
    railway variables set WEB_APP_URL="$RAILWAY_DOMAIN"
    railway variables set WEBAPP_URL="$RAILWAY_DOMAIN"

    # Update ePayco URLs if configured
    if [ ! -z "$EPAYCO_PUBLIC_KEY" ]; then
        railway variables set EPAYCO_RESPONSE_URL="$RAILWAY_DOMAIN/epayco/response"
        railway variables set EPAYCO_CONFIRMATION_URL="$RAILWAY_DOMAIN/epayco/confirmation"
    fi

    echo "✅ URL variables updated"
    echo ""

    # Redeploy with updated URLs
    echo "🚀 Redeploying with updated URLs..."
    railway up
    echo "✅ Final deployment complete"
    echo ""
fi

# Show status
echo "📊 Deployment Status"
echo "===================="
railway status
echo ""

# Final instructions
echo "✅ Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Test your bot: Open Telegram and send /start"
echo "2. Check logs: railway logs"
echo "3. Set up Daimo webhook:"
echo "   - Go to https://pay.daimo.com/dashboard"
echo "   - Add webhook URL: $RAILWAY_DOMAIN/daimo/webhook"
echo "   - Copy the webhook token to DAIMO_WEBHOOK_TOKEN"
echo ""
echo "4. Configure ePayco webhooks (if using):"
echo "   - Go to ePayco dashboard"
echo "   - Set Response URL: $RAILWAY_DOMAIN/epayco/response"
echo "   - Set Confirmation URL: $RAILWAY_DOMAIN/epayco/confirmation"
echo ""
echo "5. Make bot admin in your channel (CHANNEL_ID: $CHANNEL_ID)"
echo ""
echo "🔗 Your bot URL: $RAILWAY_DOMAIN"
echo "📱 Your payment page: $RAILWAY_DOMAIN/pay"
echo ""
echo "To view logs: railway logs"
echo "To redeploy: railway up"
echo ""
