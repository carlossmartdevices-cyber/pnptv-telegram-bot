# PRIME Channel Migration System - Implementation Guide

## 🎯 System Overview

This complete system handles PRIME channel membership migration with:
- **Web-based activation** (no chat spam)
- **Auto-approval** for short-term passes (Week, Month, Quarterly)
- **Manual admin review** for long-term passes (Yearly, Lifetime) with proof uploads
- **Admin topic notifications** using support system
- **Scheduled deadline enforcement** (Nov 15 @ 12:00 PM Colombia Time)

---

## 📁 Files Created

### 1. **Backend Services**
- `/src/services/primeActivationService.js` - Core activation logic
- `/src/services/primeDeadlineScheduler.js` - Deadline enforcement scheduler
- `/src/bot/handlers/broadcastPrime.js` - Broadcast message functions
- `/src/bot/handlers/broadcastPrimeAdmin.js` - Admin commands

### 2. **API Routes**
- `/src/api/primeActivation.js` - REST endpoints for activation flows

### 3. **Web Interface**
- `/src/webapp/components/PrimeActivation.jsx` - React component
- `/src/webapp/components/PrimeActivation.css` - Styling

---

## ⚙️ Integration Steps

### Step 1: Register API Routes
Add to your main bot entry point (`src/bot/index.js`):

```javascript
// At the top with other requires
const primeActivationRoutes = require('./api/primeActivation');
const { handleBroadcastPrime, handleBroadcastConfirmation } = require('./handlers/broadcastPrimeAdmin');
const { initializePrimeScheduler } = require('./services/primeDeadlineScheduler');

// In your Express app setup
app.use('/api/prime-activation', primeActivationRoutes);

// Register admin command
bot.command('broadcastprime', handleBroadcastPrime);

// Register callback handler for confirmation
bot.action('confirm_prime_broadcast', handleBroadcastConfirmation);
bot.action('cancel_prime_broadcast', handleBroadcastConfirmation);

// Initialize scheduler when bot starts
bot.launch().then(() => {
  initializePrimeScheduler(bot);
  logger.info('Bot launched with PRIME scheduler');
});
```

### Step 2: Add Web Interface Route
In your Express app (`src/bot/index.js` or `src/api/index.js`):

```javascript
app.get('/prime-activation', (req, res) => {
  res.sendFile(path.join(__dirname, '../webapp/prime-activation.html'));
});
```

### Step 3: Update Environment Variables
Verify these are set in `.env`:

```env
# Already configured:
CHANNEL_ID=-1002997324714        # PRIME channel
TELEGRAM_BOT_TOKEN=YOUR_TOKEN
WEBAPP_URL=https://pnptv.app    # Base URL for web interface
TELEGRAM_BOT_USERNAME=PNPtvBot
```

### Step 4: Update Package Dependencies
Ensure these are in `package.json`:

```json
{
  "dependencies": {
    "multer": "^1.4.5",
    "node-cron": "^3.0.0"
  }
}
```

Run: `npm install multer node-cron`

---

## 🚀 Usage

### Send Broadcast (Admin)
```bash
# In Telegram, send this command to the bot
/broadcastprime

# Follow the confirmation prompt
```

**What happens:**
1. Admin gets confirmation inline menu
2. Clicks "✅ Send Broadcast"
3. Message sent to PRIME channel with activation button
4. Members click button → Opens web interface
5. Select tier → Auto-approve or upload proof

### For Testing
Create temporary test commands:

```javascript
// Add to your admin handlers for testing

// Test: Send broadcast immediately
bot.command('testbroadcast', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  await sendPrimeChannelBroadcast(ctx, bot);
});

// Test: Trigger 24-hour warning
bot.command('testwarning', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const { manuallyTriggerWarning } = require('./services/primeDeadlineScheduler');
  const result = await manuallyTriggerWarning(bot);
  await ctx.reply(`✅ Warning sent:\n${JSON.stringify(result, null, 2)}`);
});

// Test: Trigger enforcement
bot.command('testenforce', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const { manuallyTriggerEnforcement } = require('./services/primeDeadlineScheduler');
  const result = await manuallyTriggerEnforcement(bot);
  await ctx.reply(`✅ Enforcement completed:\n${JSON.stringify(result, null, 2)}`);
});
```

---

## 📊 User Flow

### Auto-Approval (Week/Month/Quarterly)
```
User → Clicks "Activate Membership" → Selects Tier
    → Web Interface (no upload needed)
    → Instant Approval ✅
    → Welcome message with dates
    → Permissions updated in PRIME channel
```

### Manual Review (Yearly/Lifetime)
```
User → Clicks "Activate Membership" → Selects Tier
    → Upload Proof of Payment
    → Ticket created in Firestore
    → Admin notified in PRIME channel
    → Admin reviews & approves/rejects
    → User receives confirmation
    → Permissions updated (if approved)
```

---

## 🔐 Admin Review System

**Where admins see pending reviews:**
1. **Firestore Console** - `primeActivationReviews` collection
2. **PRIME Channel** - Admin notifications appear as messages
3. **API Endpoint** - GET `/api/prime-activation/pending-reviews?adminId=YOUR_ID`

**Admin approval options:**
1. Via Firestore console (manual document update)
2. Via API:
   ```bash
   POST /api/prime-activation/approve/TICKET_ID
   Body: { "adminId": 8365312597 }
   ```

3. Create dedicated admin panel (optional)

---

## 📅 Scheduled Tasks

### Automatic Timeline
- **Nov 14 @ 12:00 PM Colombia Time** - 24-hour deadline warning
- **Nov 15 @ 12:00 PM Colombia Time** - Enforcement (remove non-activated)

### To Modify Deadlines
Edit `src/services/primeDeadlineScheduler.js` cron expressions:

```javascript
// Current: 0 12 14 11 * (Nov 14 at noon)
// To change: modify the cron expression
// Format: minute hour day month *
// See https://crontab.guru for help
```

---

## 🗄️ Database Schema

### Collections Created

**1. primeActivations**
```javascript
{
  userId: "123456",
  username: "username",
  tier: "month-pass",
  status: "activated",
  approvalType: "auto" | "manual",
  startDate: Timestamp,
  endDate: Timestamp,
  createdAt: Timestamp,
  approvedBy: "adminId" (for manual only)
}
```

**2. primeActivationReviews**
```javascript
{
  userId: "123456",
  username: "username",
  type: "prime-activation",
  tier: "yearly-pass",
  status: "pending_review" | "approved" | "rejected",
  proofFileId: "filename",
  proofFileType: "image/jpeg",
  createdAt: Timestamp,
  reviewed: boolean,
  reviewedBy: "adminId",
  reviewNotes: "string"
}
```

**3. broadcasts**
```javascript
{
  type: "prime-activation",
  channel: "PRIME",
  channelId: -1002997324714,
  message: "string",
  sentAt: Timestamp,
  status: "sent",
  deadline: Timestamp,
  recipientCount: number
}
```

**4. users (updated fields)**
```javascript
{
  // Existing fields...
  tier: "premium",
  membershipTier: "month-pass",
  activatedAt: Timestamp,
  membershipStartsAt: Timestamp,
  membershipExpiresAt: Timestamp,
  nextPaymentDate: Timestamp | null,
  primeActivationMigration: true,
  primeActivationDate: Timestamp
}
```

---

## 🛠️ API Endpoints

### Public Endpoints

**POST /api/prime-activation/auto**
- Auto-approve activation for Week/Month/Quarterly
- Body: `{ userId, username, tier }`
- Response: Success with dates

**POST /api/prime-activation/manual**
- Submit manual review for Yearly/Lifetime
- Body: FormData with `userId`, `username`, `tier`, `proof` (file)
- Response: Ticket created, awaiting review

**GET /api/prime-activation/status/:userId**
- Check user's activation status
- Response: Activation details or "not_activated"

### Admin Endpoints

**POST /api/prime-activation/approve/:ticketId**
- Approve manual review ticket
- Body: `{ adminId }`
- Headers: Requires admin authorization

**POST /api/prime-activation/reject/:ticketId**
- Reject manual review ticket
- Body: `{ adminId, reason }`
- Headers: Requires admin authorization

**GET /api/prime-activation/pending-reviews**
- List all pending manual reviews
- Query: `?adminId=YOUR_ADMIN_ID`
- Response: Array of pending reviews

---

## 🧪 Testing Checklist

- [ ] Web interface loads without errors
- [ ] Auto-approval tier completes instantly
- [ ] Manual review tier requires file upload
- [ ] Admin receives notification for manual reviews
- [ ] Admin can approve from API
- [ ] Admin can reject with reason
- [ ] User receives success message with dates
- [ ] User receives rejection message
- [ ] Scheduled warning runs (test with manual trigger)
- [ ] Scheduled enforcement removes non-activated
- [ ] Permissions updated in PRIME channel
- [ ] Firestore collections populated correctly

---

## 🐛 Troubleshooting

**Issue: Web interface not loading**
- Verify `WEBAPP_URL` in .env
- Check React component mount point in HTML
- Verify multer dependency installed

**Issue: File upload fails**
- Check multer storage configuration
- Verify 5MB file size limit is acceptable
- Ensure MIME types allowed (JPEG, PNG, PDF)

**Issue: Admin notifications not appearing**
- Verify `CHANNEL_ID` is correct and bot is admin there
- Check bot permissions in PRIME channel
- Review logger output for errors

**Issue: Scheduled jobs not running**
- Verify node-cron is installed
- Check system timezone (should be UTC)
- Review scheduler initialization in bot.js

---

## 📝 Important Notes

1. **File uploads**: Currently stored in Firestore metadata. Consider upgrading to Cloud Storage for production.
2. **Timezone**: All cron jobs use UTC. Adjust expressions based on your timezone if needed.
3. **Channel access**: Bot must be admin in PRIME channel to send/modify messages.
4. **Deadline rigorous**: No exceptions stated - enforcement will remove ALL non-activated members.

---

## 🎉 Ready to Launch!

1. Register routes in bot.js
2. Install dependencies: `npm install multer node-cron`
3. Test with `/testbroadcast` command
4. Send actual broadcast: `/broadcastprime`
5. Monitor admin notifications and approvals
6. System auto-enforces on Nov 15 @ 12:00 PM

Questions? Check logs with: `pm2 logs pnptv-bot`
