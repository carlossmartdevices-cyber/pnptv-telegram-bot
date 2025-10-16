# 🔐 Security Checklist

## ⚠️ BEFORE DEPLOYING TO PRODUCTION

### 1. Rotate ALL Credentials

- [ ] **Telegram Bot Token**
  - Go to [@BotFather](https://t.me/botfather)
  - Send `/mybots`
  - Select your bot → API Token → Revoke current token
  - Copy new token to `.env` file

- [ ] **ePayco API Keys**
  - Login to ePayco dashboard
  - Navigate to API settings
  - Generate new API Key and Secret Key
  - Update `.env` file

- [ ] **Firebase Service Account**
  - Go to [Firebase Console](https://console.firebase.google.com/)
  - Project Settings → Service Accounts
  - Generate new private key
  - Delete old service account
  - Save new key as `src/config/firebase_credentials.json`

### 2. Clean Git History

**Remove exposed credentials from git history:**

```bash
# Option 1: Using BFG Repo-Cleaner (Recommended)
brew install bfg  # or download from https://rtyley.github.io/bfg-repo-cleaner/

# Remove specific files
bfg --delete-files firebase_credentials.json
bfg --delete-files .env

# Remove old credentials (create passwords.txt with old tokens)
bfg --replace-text passwords.txt

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

```bash
# Option 2: Using git filter-repo
pip install git-filter-repo

# Remove files
git filter-repo --path firebase_credentials.json --invert-paths
git filter-repo --path .env --invert-paths
```

### 3. Verify .gitignore

Ensure these are in `.gitignore`:

```
.env
.env.local
.env.*.local
firebase_credentials.json
src/config/firebase_credentials.json
**/firebase_credentials.json
logs/
sessions.json
```

### 4. Environment Variables

Create `.env` file with NEW credentials:

```env
# Telegram
TELEGRAM_TOKEN=YOUR_NEW_TOKEN_HERE

# ePayco Payment API

# Channel
CHANNEL_ID=YOUR_CHANNEL_ID

# Application
NODE_ENV=production
LOG_LEVEL=info
PORT=3000

# Webhook (for production)
WEBHOOK_URL=https://yourdomain.com
```

### 5. Production Server Setup

```bash
# Install dependencies
npm install --production

# Create logs directory
mkdir -p logs

# Set proper permissions
chmod 700 logs
chmod 600 .env
chmod 600 src/config/firebase_credentials.json

# Test the bot
npm start
```

### 6. Deploy Firestore Indexes

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init firestore

# Deploy indexes
firebase deploy --only firestore:indexes
```

### 7. Security Best Practices

- [ ] Never commit `.env` file
- [ ] Never commit `firebase_credentials.json`
- [ ] Use environment variables for all secrets
- [ ] Enable 2FA on all accounts (Telegram, Firebase, ePayco)
- [ ] Regularly rotate credentials (every 90 days)
- [ ] Monitor logs for suspicious activity
- [ ] Set up error alerting (Sentry, etc.)
- [ ] Use HTTPS for all webhooks
- [ ] Validate webhook signatures
- [ ] Implement rate limiting (already done ✅)
- [ ] Sanitize all user inputs (already done ✅)

### 8. Monitoring

Set up monitoring for:
- Unauthorized access attempts
- Unusual payment activity
- High error rates
- Bot downtime

### 9. Backup Strategy

- [ ] Regular database backups (Firebase automatic backups)
- [ ] Export user data periodically
- [ ] Keep credentials in secure password manager
- [ ] Document recovery procedures

### 10. Compliance

- [ ] GDPR compliance (user data deletion)
- [ ] Age verification enforcement
- [ ] Terms of Service up to date
- [ ] Privacy Policy up to date
- [ ] User consent tracking

---

## ✅ Post-Deployment Checklist

After deploying:

- [ ] Test all bot commands
- [ ] Test payment flow end-to-end
- [ ] Verify webhooks are working
- [ ] Check logs for errors
- [ ] Monitor first 100 users
- [ ] Set up alerting
- [ ] Document any issues

---

## 🚨 Emergency Procedures

### If credentials are compromised:

1. **Immediately rotate all credentials**
2. **Revoke old tokens/keys**
3. **Check logs for unauthorized access**
4. **Notify affected users if needed**
5. **Review and update security measures**

### Emergency Contacts:

- Telegram Support: @BotSupport
- ePayco Support: [support email]
- Firebase Support: Firebase Console

---

**Last Updated:** [Current Date]
**Reviewed By:** [Your Name]

