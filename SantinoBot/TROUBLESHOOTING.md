# 🔧 Troubleshooting Guide

Common issues and how to fix them.

## Bot Not Starting

### Error: "Missing required environment variables"

**Problem:** Your `.env` file is missing or incomplete.

**Solution:**
```bash
# Check if .env exists
ls -la .env

# If missing, run setup
npm run setup

# Edit .env with your values
nano .env

# Verify configuration
npm run check-config
```

**What to check:**
- ✅ BOT_TOKEN is set (from @BotFather)
- ✅ FIREBASE_PROJECT_ID is set
- ✅ FIREBASE_CLIENT_EMAIL is set  
- ✅ FIREBASE_PRIVATE_KEY is set (with quotes)

### Error: "Failed to initialize Firebase"

**Problem:** Firebase credentials are incorrect or malformed.

**Solution:**
1. Check your Firebase private key includes the full key:
   ```
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
   ```
2. Make sure the key is wrapped in **double quotes**
3. Keep the `\n` characters - they're important!
4. Copy credentials exactly from your main bot

### Error: "401 Unauthorized" or "Bot token invalid"

**Problem:** Bot token is wrong or expired.

**Solution:**
1. Go to [@BotFather](https://t.me/BotFather)
2. Send `/mybots`
3. Select your bot
4. Click "API Token"
5. Copy the new token to your `.env` file

## Bot Not Responding

### Bot added to group but not working

**Checklist:**
1. ✅ Bot is added as **administrator** (not just member)
2. ✅ Bot has required permissions:
   - Delete messages ✅
   - Restrict members ✅
3. ✅ Bot is running (check terminal/logs)
4. ✅ GROUP_ID in .env matches your group (optional)

**To check bot status:**
```bash
# In group, send:
/status

# If no response, check bot logs
```

### Bot deletes ALL media, even from premium users

**Problem:** User not in Firebase database or expired subscription.

**Solution:**
1. Check if user exists in Firebase:
   - Open Firebase Console
   - Go to Firestore
   - Check `users` collection
   - Find user by Telegram ID
   
2. Verify user's tier field:
   ```
   tier: "Free" | "trial-week" | "pnp-member" | "crystal-member" | "diamond-member"
   ```

3. Check expiry date:
   ```
   membershipExpiresAt: [Timestamp must be in future]
   ```

## Permission Issues

### Error: "Bot has insufficient rights"

**Problem:** Bot doesn't have required admin permissions.

**Solution:**
1. Open group settings
2. Go to Administrators
3. Find your bot
4. Enable these permissions:
   - ✅ Delete messages
   - ✅ Restrict members
5. Save and restart bot

### Messages not being deleted

**Problem:** Bot can't delete messages or lacks permissions.

**Checks:**
1. Bot is admin? → Yes
2. "Delete messages" enabled? → Yes
3. Bot is running? → Check logs
4. Any errors in logs? → Fix them

## Firebase Issues

### Error: "Permission denied" from Firebase

**Problem:** Firebase security rules or wrong credentials.

**Solution:**
1. Check Firestore rules allow read/write
2. Verify service account has correct permissions
3. Make sure you're using the same Firebase project as main bot

### Error: "Collection not found"

**Problem:** Database structure doesn't exist yet.

**Solution:**
This is normal for new setups. The bot will auto-create data structures when:
- Users join the group
- Commands are used
- Config is updated

## Common Mistakes

### ❌ .env file has spaces around =
```bash
# WRONG
BOT_TOKEN = your_token

# CORRECT
BOT_TOKEN=your_token
```

### ❌ Private key missing quotes
```bash
# WRONG
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...

# CORRECT
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### ❌ Bot token includes extra text
```bash
# WRONG
BOT_TOKEN=Bot 1234567890:ABC...

# CORRECT
BOT_TOKEN=1234567890:ABC...
```

### ❌ Group ID is positive number
```bash
# WRONG
GROUP_ID=1234567890

# CORRECT (negative number starting with -100)
GROUP_ID=-1001234567890
```

## Getting Help

### Check Logs

```bash
# View recent logs
tail -f logs/combined.log

# View error logs only
tail -f logs/error.log
```

### Verify Configuration

```bash
npm run check-config
```

This validates all your environment variables.

### Test Firebase Connection

```bash
node -e "require('./src/config/firebase'); console.log('✅ Firebase connected!')"
```

### Debug Mode

Enable detailed logging:

```bash
# In .env file
LOG_LEVEL=debug

# Restart bot
npm start
```

## Still Stuck?

1. 📖 Read [GETTING_STARTED.md](GETTING_STARTED.md)
2. 📚 Check [QUICKSTART.md](QUICKSTART.md)
3. 🔍 Search existing issues on GitHub
4. 💬 Contact support with:
   - Error message (full text)
   - Logs (without sensitive data)
   - Steps you've tried
   - Your setup (OS, Node version)

## Quick Diagnostic

Run this to check everything:

```bash
# 1. Check Node version (needs 16+)
node --version

# 2. Check dependencies installed
npm list --depth=0

# 3. Verify .env exists
cat .env | grep -v PRIVATE_KEY

# 4. Test configuration
npm run check-config

# 5. Check Firebase
node -e "require('./src/config/firebase')"

# 6. Start in debug mode
LOG_LEVEL=debug npm start
```

---

**Most issues are fixed by:**
1. ✅ Checking `.env` file is correct
2. ✅ Verifying bot has admin permissions
3. ✅ Ensuring Firebase credentials match main bot
4. ✅ Restarting the bot after changes
