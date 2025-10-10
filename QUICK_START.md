# 🚀 Quick Start Guide

## Step 1: Clean Git History (15 minutes)

### Option A: Using BFG Repo-Cleaner (Recommended - Already Downloaded!)

```bash
# 1. Check Java is installed
java -version
# If not installed: sudo apt install default-jre

# 2. Create list of files to remove
echo "firebase_credentials.json" > files-to-delete.txt
echo ".env" >> files-to-delete.txt

# 3. Run BFG to remove files from history
java -jar ~/bin/bfg.jar --delete-files firebase_credentials.json
java -jar ~/bin/bfg.jar --delete-files .env

# 4. Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. Force push (if you have a remote)
# git push --force origin main
```

### Option B: Using git filter-repo (Alternative)

```bash
# 1. Install git-filter-repo
pip3 install git-filter-repo

# 2. Remove files
git filter-repo --path firebase_credentials.json --invert-paths --force
git filter-repo --path .env --invert-paths --force
git filter-repo --path src/config/firebase_credentials.json --invert-paths --force

# 3. Force push (if you have a remote)
# git push --force origin main
```

### Option C: Simple (but less thorough)

```bash
# This only removes from current commit, not history
git rm --cached .env
git rm --cached src/config/firebase_credentials.json
git commit -m "Remove sensitive files from tracking"
```

---

## Step 2: Rotate Credentials (20 minutes)

### Telegram Bot Token
1. Open Telegram, search for `@BotFather`
2. Send `/mybots`
3. Select your bot
4. Click "API Token"
5. Click "Revoke current token"
6. Copy the new token
7. Update `.env`: `TELEGRAM_TOKEN=NEW_TOKEN_HERE`

### Bold API Keys
1. Login to Bold dashboard
2. Go to Settings → API Configuration
3. Generate new API Key
4. Generate new Secret Key
5. Update `.env`:
   ```
   BOLD_API_KEY=NEW_KEY_HERE
   BOLD_SECRET_KEY=NEW_SECRET_HERE
   ```

### Firebase Credentials
1. Go to https://console.firebase.google.com/
2. Select your project
3. Project Settings → Service Accounts
4. Click "Generate new private key"
5. Save as `src/config/firebase_credentials.json`
6. **DO NOT** commit this file
7. Delete the old service account (optional but recommended)

---

## Step 3: Test Everything (10 minutes)

```bash
# 1. Install/update dependencies
npm install

# 2. Run tests
npm test

# 3. Start the bot
npm start

# You should see:
# ✅ Firebase initialized
# ✅ Bot started successfully
# 🤖 PNPtv Bot is running...
```

### Test in Telegram
1. Open Telegram
2. Search for your bot
3. Send `/start`
4. Complete onboarding:
   - Select language
   - Confirm age (18+)
   - Accept terms
   - Accept privacy policy
5. Test commands:
   - `/profile` - View profile
   - `/help` - Show help
   - `/map` - View map (placeholder)
   - `/subscribe` - Test subscription flow

---

## Step 4: Deploy Firestore Indexes (5 minutes)

```bash
# 1. Install Firebase CLI (if not installed)
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Initialize (if first time)
firebase init firestore
# Select: Use existing project
# Select your project
# Keep default firestore.rules
# Keep firestore.indexes.json

# 4. Deploy indexes
firebase deploy --only firestore:indexes

# You should see:
# ✔ Deploy complete!
```

---

## Step 5: Production Deployment (Optional)

### Using Webhook Mode (Recommended for production)

1. **Setup environment**:
   ```bash
   # Add to .env
   NODE_ENV=production
   WEBHOOK_URL=https://yourdomain.com
   PORT=3000
   ```

2. **Start with webhook**:
   ```bash
   node src/bot/webhook.js
   ```

3. **Use a process manager**:
   ```bash
   # Install PM2
   npm install -g pm2

   # Start bot
   pm2 start src/bot/webhook.js --name pnptv-bot

   # Save configuration
   pm2 save

   # Auto-start on reboot
   pm2 startup
   ```

### Using Long Polling (Simple, good for development)

```bash
# Just run normally
npm start

# Or with PM2
pm2 start src/bot/index.js --name pnptv-bot
```

---

## 📝 Checklist

- [ ] Git history cleaned
- [ ] Telegram token rotated
- [ ] Bold API keys rotated
- [ ] Firebase credentials rotated
- [ ] `.env` updated with new credentials
- [ ] Dependencies installed (`npm install`)
- [ ] Tests passing (`npm test`)
- [ ] Bot starts successfully (`npm start`)
- [ ] Onboarding flow works in Telegram
- [ ] All commands respond
- [ ] Firestore indexes deployed
- [ ] Production deployment (if applicable)

---

## 🆘 Troubleshooting

### "Cannot find module 'winston'"
```bash
npm install winston
```

### "Cannot find module 'express'"
```bash
npm install express
```

### Bot doesn't respond
1. Check `.env` has correct `TELEGRAM_TOKEN`
2. Check internet connection
3. Check logs in `logs/error.log`
4. Try `/start` command

### Firebase errors
1. Check `firebase_credentials.json` exists
2. Check credentials are valid (not revoked)
3. Check Firestore is enabled in Firebase Console

### Tests failing
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

---

## 📚 Next Steps

1. Read full [README.md](README.md)
2. Review [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)
3. Check [CHANGES.md](CHANGES.md) for what was refactored
4. Add team members to Firebase project
5. Set up monitoring (Sentry, etc.)
6. Configure Bold webhook for payment notifications
7. Implement map functionality
8. Add live streaming features

---

## 🎉 You're Done!

Your bot is now:
- ✅ Secure (credentials rotated, input validated)
- ✅ Production-ready (logging, error handling)
- ✅ Well-documented (README, inline comments)
- ✅ Tested (unit tests for utilities)
- ✅ Maintainable (modular architecture)

**Time to celebrate! 🎊**
