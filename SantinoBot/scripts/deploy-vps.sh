#!/bin/bash
# VPS Deployment Script

echo "🖥️  VPS Deployment Script"
echo "=========================="
echo ""

read -p "Enter your VPS IP address: " VPS_IP
read -p "Enter SSH username (default: root): " SSH_USER
SSH_USER=${SSH_USER:-root}

echo ""
echo "📦 Preparing deployment package..."

# Create deployment archive
tar -czf santino-bot.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.env \
    --exclude=logs \
    --exclude=*.tar.gz \
    .

echo "✅ Package created: santino-bot.tar.gz"
echo ""
echo "📤 Uploading to VPS..."

# Upload to VPS
scp santino-bot.tar.gz $SSH_USER@$VPS_IP:/tmp/

echo "✅ Upload complete"
echo ""
echo "🔧 Now connecting to VPS to complete setup..."
echo ""

# SSH and setup
ssh $SSH_USER@$VPS_IP << 'ENDSSH'
echo "🔧 Setting up bot on VPS..."
echo ""

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

# Create directory
mkdir -p /opt/SantinoBot
cd /opt/SantinoBot

# Extract archive
echo "📂 Extracting files..."
tar -xzf /tmp/santino-bot.tar.gz
rm /tmp/santino-bot.tar.gz

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

echo ""
echo "✅ Files deployed to /opt/SantinoBot"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  IMPORTANT: Complete these steps on VPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Create .env file:"
echo "   cd /opt/SantinoBot"
echo "   nano .env"
echo ""
echo "2. Paste your configuration and save"
echo ""
echo "3. Start the bot:"
echo "   pm2 start src/bot.js --name santino-bot"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "4. Check status:"
echo "   pm2 status"
echo "   pm2 logs santino-bot"
echo ""
ENDSSH

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔐 Now SSH to your VPS to configure .env:"
echo "   ssh $SSH_USER@$VPS_IP"
echo "   cd /opt/SantinoBot"
echo "   nano .env"
echo ""

# Cleanup
rm santino-bot.tar.gz

echo "📚 See DEPLOY_GUIDE.md for detailed instructions"
echo ""
