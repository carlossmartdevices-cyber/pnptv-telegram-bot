# 🚀 Getting Started - 5 Minutes Setup

Follow these simple steps to get your bot running:

## Step 1: Setup (1 minute)

```bash
npm run setup
```

This will install dependencies and create your `.env` file.

## Step 2: Get Bot Token (2 minutes)

1. Open Telegram and search for **@BotFather**
2. Send: `/newbot`
3. Follow the prompts to create your bot
4. **Copy the token** you receive

## Step 3: Configure (2 minutes)

Edit the `.env` file that was created:

```bash
nano .env
# or use any text editor
```

**Paste your values:**

```env
BOT_TOKEN=paste_your_token_here
FIREBASE_PROJECT_ID=copy_from_main_bot
FIREBASE_PRIVATE_KEY="copy_from_main_bot"
FIREBASE_CLIENT_EMAIL=copy_from_main_bot
GROUP_ID=your_group_id
```

### Where to get Firebase credentials?

Copy from your main PNPtv bot's configuration file.

### How to get Group ID?

1. Add your bot to the group as admin
2. Forward any message from the group to [@userinfobot](https://t.me/userinfobot)
3. Copy the group ID (starts with -100...)

## Step 4: Verify Configuration

```bash
npm run check-config
```

This will validate all your settings. Fix any errors shown.

## Step 5: Start Bot

```bash
npm start
```

**That's it!** Your bot is now running. 🎉

## Test It

1. Join your group with a free account
2. Try sending a photo → Should be deleted
3. Upgrade to premium
4. Send a photo again → Should work!

## Quick Commands

```bash
npm run setup          # Setup wizard
npm run check-config   # Validate config
npm start              # Start bot (production)
npm run dev            # Start with auto-reload
```

## Need Help?

- ❓ Common issues? See [QUICKSTART.md](QUICKSTART.md)
- 🚀 Deploy to cloud? See [DEPLOYMENT.md](DEPLOYMENT.md)
- ⚙️ Advanced features? See [NEW_FEATURES_GUIDE.md](NEW_FEATURES_GUIDE.md)

## Bot Admin Permissions

When adding bot to group, enable these permissions:

✅ **Required:**
- Delete messages
- Restrict members

✅ **Optional:**
- Pin messages

❌ **Not needed:**
- Add new admins
- Change group info

---

**Still stuck?** Check the logs for detailed error messages or review QUICKSTART.md for detailed instructions.
