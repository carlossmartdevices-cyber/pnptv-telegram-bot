#!/bin/bash

echo "🤖 Santino Group Bot Setup"
echo "=========================="
echo

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your configuration."
else
    echo "⚠️  .env file already exists."
fi

echo
echo "📋 Setup Checklist:"
echo "==================="
echo
echo "1. ✅ Dependencies installed"
echo "2. 📝 Edit .env file with your bot token and Firebase credentials"
echo "3. 🤖 Create bot with @BotFather if you haven't already"
echo "4. 👑 Add bot to your group as administrator with these permissions:"
echo "   - Delete messages"
echo "   - Restrict members"
echo "   - (Optional) Pin messages"
echo "5. 🆔 Get your group ID and add it to .env (optional)"
echo "6. 🚀 Run 'npm start' to start the bot"
echo
echo "🔧 Commands:"
echo "============"
echo "npm start     - Start the bot"
echo "npm run dev   - Start with auto-reload (development)"
echo
echo "📚 For detailed setup instructions, see README.md"
echo

# Check if Firebase credentials are available
if [ -z "$FIREBASE_PROJECT_ID" ] && ! grep -q "FIREBASE_PROJECT_ID=" .env 2>/dev/null; then
    echo "⚠️  Remember to copy Firebase credentials from your main PNPtv bot!"
fi