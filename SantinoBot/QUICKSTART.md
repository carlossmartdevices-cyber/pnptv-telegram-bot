# 🚀 Quick Start Guide - Santino Group Bot

## Step 1: Bot Creation

1. **Message @BotFather** on Telegram
2. **Create new bot**: `/newbot`
3. **Choose name**: "Santino Group Manager" (or any name)
4. **Choose username**: Must end in 'bot' (e.g., `santino_group_manager_bot`)
5. **Save the token** - you'll need it for configuration

## Step 2: Get Group ID

1. **Add bot to your group** as administrator
2. **Send a message** in the group mentioning the bot: `@your_bot_name hello`
3. **Check bot logs** or use online tools to get the group ID
4. **Alternative**: Forward a message from the group to @userinfobot

## Step 3: Bot Permissions

Your bot needs these administrator permissions in the group:
- ✅ **Delete messages** (to remove unauthorized media)
- ✅ **Restrict members** (to set user permissions)
- ❌ **Pin messages** (optional)
- ❌ **Add new admins** (not needed)
- ❌ **Change group info** (not needed)

## Step 4: Configuration

1. **Copy Firebase credentials** from your main PNPtv bot
2. **Edit `.env` file**:
   ```env
   BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   FIREBASE_PROJECT_ID=your-firebase-project
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   GROUP_ID=-1001234567890
   ```

## Step 5: Test & Run

1. **Install dependencies**: `npm install`
2. **Test configuration**: `npm test`
3. **Start bot**: `npm start`

## Step 6: Verify Working

1. **Join the group** with a free account
2. **Try sending a photo** - should be deleted with warning
3. **Upgrade account** to premium in main bot
4. **Try sending media again** - should work

## Troubleshooting

### Bot not responding
- Check bot token is correct
- Verify bot is admin in group
- Check Firebase credentials

### Permissions not working
- Ensure bot has "Restrict members" permission
- Check user data exists in Firestore
- Verify group ID matches

### Firebase errors
- Copy exact credentials from main bot
- Check private key formatting (keep \n characters)
- Verify project ID matches

## Production Deployment

For production, deploy to:
- **Railway** (recommended)
- **Heroku**
- **Your VPS**

See `DEPLOYMENT.md` for detailed instructions.

---

🎉 **Your group bot is ready!** Free users can only send text, premium users get full media access.