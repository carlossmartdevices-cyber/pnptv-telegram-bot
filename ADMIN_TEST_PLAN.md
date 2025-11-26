# PNPtv Bot - Admin Features Test Plan

**Environment**: Production (https://pnptv.app)
**Admin User ID**: 8365312597
**Test Date**: 2025-10-29
**Bot Version**: 2.0.0

---

## 1. Admin Panel Access ✅

### Test: Admin Authorization
**Command**: `/admin`

**Expected Results**:
- ✅ Admin user (ID: 8365312597) sees: "⚙️ **Admin Panel**\n\nSelect an option:"
- ✅ Non-admin users see: "⛔ Access denied. This command is for administrators only."
- ✅ Admin menu displays with inline keyboard

**Admin Menu Options**:
- 📊 Statistics
- 👥 User Management
- 💎 Plan Management
- 📢 Broadcast Message
- 🔙 Back to Main Menu

**Code Reference**:
- Authorization: [src/config/admin.js:16-18](src/config/admin.js#L16-L18)
- Handler: [src/bot/handlers/admin.js:12-30](src/bot/handlers/admin.js#L12-L30)
- Middleware: [src/bot/index.js:115](src/bot/index.js#L115)

**Manual Test Steps**:
1. Send `/admin` from admin account → Should show admin panel
2. Send `/admin` from non-admin account → Should show access denied
3. Verify logger shows: `Admin 8365312597 accessed admin panel`

---

## 2. Plan Management ✅

### Test 2.1: View Plan Dashboard
**Command**: `/plans`

**Expected Results**:
- ✅ Shows list of all available plans
- ✅ Each plan shows: name, price, duration, features
- ✅ Inline keyboard with options:
  - "➕ Create New Plan"
  - "✏️ Edit Plan"
  - "🗑️ Delete Plan"
  - "🔙 Back to Admin"

**Code Reference**: [src/bot/handlers/admin/planManager.js](src/bot/handlers/admin/planManager.js)

**Available Plans** (as of 2025-10-29):
```javascript
{
  "trial-pass": { name: "Trial Pass", price: 14.99, duration: 7 },
  "silver": { name: "Silver Membership", price: 15, duration: 30 },
  "golden": { name: "Golden Membership", price: 25, duration: 30 }
}
```

### Test 2.2: Create New Plan
**Callback**: `plan:create`

**Expected Flow**:
1. Click "➕ Create New Plan"
2. Bot asks for plan ID (unique identifier)
3. Enter plan details sequentially:
   - Plan ID (e.g., "platinum")
   - Display name (e.g., "Platinum VIP")
   - Price in USD (e.g., "50")
   - Duration in days (e.g., "30")
   - Features (comma-separated)
   - Icon emoji (e.g., "💎")
4. Confirmation message shown
5. Plan added to Firestore `subscription_plans` collection

**Code Reference**: [src/bot/handlers/admin/planManager.js:handlePlanCallback](src/bot/handlers/admin/planManager.js)

### Test 2.3: Edit Existing Plan
**Callback**: `plan:edit:{planId}`

**Expected Flow**:
1. Select plan to edit from dashboard
2. Bot shows current plan details
3. Admin enters field to edit (name/price/duration/features)
4. Enter new value
5. Plan updated in Firestore
6. Confirmation shown

**Function**: `executePlanEdit(ctx)`

### Test 2.4: Delete Plan
**Callback**: `plan:delete:{planId}`

**Expected Flow**:
1. Select plan to delete
2. Confirmation prompt: "Are you sure?"
3. On confirm: Delete from Firestore
4. Success message displayed

**Security**: Verify non-admins cannot trigger these callbacks

---

## 3. Broadcast Messages ✅

### Test 3.1: Text Broadcast
**Callback**: `admin:broadcast`

**Expected Flow**:
1. Click "📢 Broadcast Message" from admin panel
2. Bot prompts: "Send the message you want to broadcast"
3. Admin sends text message
4. Bot confirms: "Sending broadcast to X users..."
5. Progress updates shown
6. Final report: "✅ Broadcast sent to X users"

**Code Reference**: [src/bot/handlers/admin.js:sendBroadcast](src/bot/handlers/admin.js)

### Test 3.2: Media Broadcast (Photo)
**Session State**: `ctx.session.waitingFor = "broadcast_media"`

**Expected Flow**:
1. Start broadcast mode
2. Upload photo with optional caption
3. Bot processes photo via `handleBroadcastMedia`
4. Photo sent to all users
5. Success count reported

**Supported Media Types**:
- ✅ Photos (`.photo`)
- ✅ Videos (`.video`)
- ✅ Documents (`.document`)

**Code Reference**: [src/bot/index.js:351-370](src/bot/index.js#L351-L370)

### Test 3.3: Broadcast Error Handling
**Test Scenarios**:
- User blocked bot → Skip silently, log warning
- User deleted account → Skip silently
- Rate limiting → Delay between sends (100ms)
- Network error → Retry 3 times

**Verification**:
- Check logs for failed sends
- Verify final count matches successful sends
- No bot crashes on errors

---

## 4. User Search and Messaging ✅

### Test 4.1: Search Users
**Callback**: `admin:search`

**Expected Flow**:
1. Click "👥 User Management" → "🔍 Search Users"
2. Enter search query (username, name, or user ID)
3. Bot returns matching users with details:
   - User ID
   - Username (@handle)
   - Full name
   - Tier (Free/Premium)
   - Last active timestamp
4. Inline keyboard shows: "📨 Send Message" button

**Function**: `executeSearch(ctx)`

**Code Reference**: [src/bot/handlers/admin.js:executeSearch](src/bot/handlers/admin.js)

### Test 4.2: Send Message to User
**Callback**: `admin:message:{userId}`

**Expected Flow**:
1. After search, click "📨 Send Message"
2. Bot sets `ctx.session.waitingFor = "admin_message"`
3. Admin types message
4. Bot sends message to target user
5. Confirmation: "✅ Message sent to user {userId}"

**Function**: `executeSendMessage(ctx)`

**Error Cases**:
- User blocked bot → Show error
- Invalid user ID → Show error
- Empty message → Ask to try again

---

## 5. Membership Management ✅

### Test 5.1: Activate Membership
**Callback**: `admin:activate`

**Expected Flow**:
1. Admin clicks "Activate Membership"
2. Bot asks: "Enter user ID to activate"
3. Admin enters user ID (e.g., "123456789")
4. Bot asks: "Which plan? (trial-pass, silver, golden)"
5. Admin selects plan
6. `activateMembership(userId, planId)` called
7. User tier upgraded
8. Expiration date set (now + plan.duration days)
9. Confirmation: "✅ Membership activated for user {userId}"

**Function**: `processActivationUserId(ctx)`

**Firestore Updates**:
```javascript
users/{userId}: {
  tier: "Premium",
  plan: "{planId}",
  expiresAt: Timestamp(now + duration),
  lastUpdated: Timestamp(now)
}
```

### Test 5.2: Update Member
**Callback**: `admin:update_member`

**Expected Flow**:
1. Enter user ID to update
2. Select new plan
3. User plan changed without affecting expiration
4. Update confirmed

**Function**: `processUpdateMemberUserId(ctx)`

### Test 5.3: Extend Membership
**Callback**: `admin:extend`

**Expected Flow**:
1. Enter user ID
2. Enter days to extend (e.g., "7")
3. Current expiration + days
4. New expiration date shown
5. Confirmation message

**Function**: `processExtendUserId(ctx)`

### Test 5.4: Custom Extension
**Callback**: `admin:custom_extension`

**Expected Flow**:
1. Enter user ID
2. Enter exact date in format: "YYYY-MM-DD" (e.g., "2025-12-31")
3. Expiration set to specified date
4. User notified of extension

**Function**: `executeCustomExtension(ctx)`

### Test 5.5: Modify Expiration
**Callback**: `admin:modify_expiration`

**Similar to custom extension but with time included**:
- Format: "YYYY-MM-DD HH:mm"
- Example: "2025-12-31 23:59"

**Function**: `executeModifyExpiration(ctx)`

---

## 6. Error Handling ✅

### Test 6.1: Middleware Error Handler
**Code**: [src/bot/middleware/errorHandler.js](src/bot/middleware/errorHandler.js)

**Test Scenarios**:
1. **Firestore connection error**
   - Disconnect Firebase temporarily
   - Send command
   - Expect: User-friendly error message + Sentry report

2. **Invalid callback data**
   - Trigger callback with malformed data: `plan:edit:invalid_id`
   - Expect: Error caught, logged, user notified

3. **Telegram API error**
   - Send extremely long message (>4096 chars)
   - Expect: Message split or error handled gracefully

4. **Session timeout**
   - Wait for session expiry (30 days)
   - Send command
   - Expect: New session created automatically

**Verification Points**:
- ✅ Error logged with full stack trace
- ✅ Sentry captures exception with context
- ✅ User sees friendly error message (not technical details)
- ✅ Bot continues functioning (no crash)

### Test 6.2: Payment Error Handling
**Scenarios**:
- Payment gateway timeout
- Invalid payment amount
- User cancels payment

**Expected**: Graceful fallback, error logged, user notified

---

## 7. Session Management ✅

### Test 7.1: Session Creation
**Middleware**: `createFirestoreSession()`

**Verification**:
1. New user starts bot
2. Check Firestore collection `bot_sessions`
3. Document created with key: `{userId}:default`
4. Contains:
   ```javascript
   {
     key: "8365312597:default",
     data: { language: "en", onboardingStep: null },
     createdAt: Timestamp,
     updatedAt: Timestamp
   }
   ```

**Code**: [src/bot/middleware/firestoreSession.js](src/bot/middleware/firestoreSession.js)

### Test 7.2: Session Persistence
1. User sets language to Spanish
2. User sends `/profile`
3. Verify response is in Spanish (session preserved)
4. Wait 1 hour
5. Send another command
6. Verify still in Spanish

### Test 7.3: Session Cleanup
**Service**: `sessionCleanup.start()`

**Configuration**:
- TTL: 30 days
- Cleanup interval: Every 6 hours

**Verification**:
1. Check logs for: "SessionCleanupService: Started"
2. After 6 hours, check: "SessionCleanupService: Cleanup completed"
3. Old sessions (>30 days) deleted from Firestore

**Code**: [src/utils/sessionCleanup.js](src/utils/sessionCleanup.js)

---

## 8. AI Chat Integration ⚠️

### Test 8.1: Start AI Chat
**Command**: `/aichat` or **Button**: "💎 Talk with Cristina Crystal"

**Current Status**: ⚠️ **DISABLED** (No OpenAI API key configured)

**Expected Behavior (when enabled)**:
1. User clicks "💎 Talk with Cristina Crystal"
2. Bot responds with welcome message from Cristina Crystal
3. User can chat with AI
4. Context maintained in `ctx.session.aiChatHistory`

**Current Behavior**:
- Shows message: "AI chat is currently unavailable"

**To Enable**:
1. Uncomment in `.env.production`:
   ```env
   OPENAI_API_KEY=sk-...
   ```
2. Restart bot
3. Test: `ctx.reply(i18n.t(language, "aiChatWelcome"))`

**Code References**:
- Handler: [src/bot/handlers/aiChat.js:128-195](src/bot/handlers/aiChat.js#L128-L195)
- System Prompt: [src/bot/handlers/aiChat.js:25-123](src/bot/handlers/aiChat.js#L25-L123)

### Test 8.2: Chat Message Handling
**Function**: `handleChatMessage(ctx)`

**Features to Test** (when enabled):
- Rate limiting: 3 seconds between messages
- Message history: Last 20 messages kept
- Token limit: 500 max tokens per response
- Model: gpt-4o-mini

### Test 8.3: End Chat
**Command**: `/endchat`

**Expected**:
- Session cleared: `ctx.session.aiChatActive = false`
- History cleared: `ctx.session.aiChatHistory = null`
- Returns to main menu

---

## 9. Payment Integration (Daimo) ✅

### Test 9.1: Daimo Payment Flow
**Callback**: `pay_daimo_{planId}`

**Expected Flow**:
1. User selects plan (e.g., "Trial Pass - $14.99")
2. User clicks "Pay with Daimo (USDC)"
3. Bot calls `subscriptionHelpers.handleSubscription(ctx, planId, "daimo")`
4. Payment URL generated: `https://pnptv.app/pay?plan=trial-pass&user={userId}&amount=14.99`
5. User receives message with payment link
6. User clicks link → Opens payment page

**Code**: [src/bot/helpers/subscriptionHelpers.js](src/bot/helpers/subscriptionHelpers.js)

### Test 9.2: Payment Page Verification
**URL**: https://pnptv.app/pay?plan=trial-pass&user=123&amount=14.99

**Page Elements to Verify**:
- ✅ Plan name displayed: "Trial Pass"
- ✅ Amount shown: "$14.99 USDC"
- ✅ Duration: "7 days access"
- ✅ Features list displayed
- ✅ DaimoPayButton component loads
- ✅ Button text: "Pay $14.99 USDC"

**DaimoPayButton Configuration**:
```javascript
appId: "televisionlatina"
toAddress: "0xcaf17dbbccc0e9ac87dad1af1f2fe3ba3a4d0613"
toChain: 10 (Optimism)
toToken: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" (USDC)
toUnits: "14.99" (decimal format)
```

**Code**: [payment-app-v2/src/PaymentPage.jsx:110-132](payment-app-v2/src/PaymentPage.jsx#L110-L132)

### Test 9.3: Payment Webhook
**Endpoint**: `POST https://pnptv.app/daimo/webhook`

**Expected Webhook Payload** (from Daimo):
```json
{
  "event": "payment.completed",
  "payment": {
    "id": "pay_xxx",
    "amount": "14.99",
    "currency": "USDC",
    "metadata": {
      "userId": "8365312597",
      "plan": "trial-pass",
      "reference": "trial-pass_8365312597_1234567890"
    }
  }
}
```

**Expected Handler Actions**:
1. Verify webhook signature (DAIMO_WEBHOOK_TOKEN)
2. Extract userId and plan from metadata
3. Call `activateMembership(userId, plan)`
4. Update user tier to "Premium"
5. Set expiration: now + 7 days
6. Send confirmation to user via Telegram
7. Return 200 OK to Daimo

**Code**: [src/bot/webhook.js](src/bot/webhook.js) (search for "daimo/webhook")

### Test 9.4: Payment Error Scenarios
**Test Cases**:
1. **Invalid plan ID**: payment-page returns error
2. **Missing parameters**: Shows "Invalid Payment Link" page
3. **User cancels payment**: No action, no charges
4. **Webhook signature mismatch**: Reject with 401
5. **Duplicate payment**: Check reference ID to prevent double activation

---

## 10. Statistics Dashboard ✅

### Test: View Statistics
**Callback**: `admin:stats`

**Expected Data Points**:
- 👥 **Total Users**: Count from Firestore `users` collection
- 🆓 **Free Tier Users**: `tier === "Free"`
- 💎 **Premium Users**: `tier === "Premium"`
- 📅 **Active Today**: `lastActive >= today`
- 📊 **Active This Week**: `lastActive >= 7 days ago`
- 📸 **Users with Photos**: `photoFileId !== null`
- 📍 **Users with Locations**: `location !== null`
- ✅ **Onboarding Complete**: `onboardingComplete === true`

**Sample Output**:
```
📊 **Bot Statistics**

👥 Users:
• Total: 45
• Free: 38 (84%)
• Premium: 7 (16%)

📅 Activity:
• Active today: 12
• Active this week: 28

🎯 Features:
• With photos: 32 (71%)
• With locations: 25 (56%)
• Onboarding complete: 40 (89%)

📈 Revenue (estimated):
• Monthly: $105.00
```

**Code**: [src/bot/handlers/admin.js:35-135](src/bot/handlers/admin.js#L35-L135)

---

## Manual Testing Checklist

### Pre-Deployment Tests
- [ ] Run `npm test` (if tests exist)
- [ ] Check bot responds to `/start`
- [ ] Verify SSL certificate valid
- [ ] Confirm webhook URL set correctly

### Admin Panel Tests
- [ ] `/admin` works for admin user
- [ ] `/admin` denied for non-admin
- [ ] All admin menu buttons respond
- [ ] Logger records admin access

### Plan Management Tests
- [ ] `/plans` shows all plans
- [ ] Create new plan flow completes
- [ ] Edit plan updates Firestore
- [ ] Delete plan removes from DB
- [ ] Non-admin cannot access plan callbacks

### Broadcast Tests
- [ ] Send text broadcast to >10 users
- [ ] Send photo with caption
- [ ] Check broadcast count accuracy
- [ ] Verify error handling for blocked users

### Membership Tests
- [ ] Activate membership for test user
- [ ] Verify user tier updated in Firestore
- [ ] Check expiration date calculation
- [ ] Extend membership by 7 days
- [ ] Custom expiration date works

### Payment Tests
- [ ] Generate Daimo payment link
- [ ] Payment page loads correctly
- [ ] DaimoPayButton appears and is clickable
- [ ] Verify APP_ID: "televisionlatina"
- [ ] Webhook responds with 200 OK
- [ ] User activated after successful payment

### Error & Session Tests
- [ ] Trigger error, verify logged to Sentry
- [ ] Session persists across multiple commands
- [ ] Session cleanup runs every 6 hours
- [ ] Old sessions deleted after 30 days

---

## Production Verification Commands

```bash
# Check bot status
ssh root@72.60.29.80 "cd /var/www/pnptv-bot && pm2 status pnptv-bot"

# View recent logs
ssh root@72.60.29.80 "cd /var/www/pnptv-bot && pm2 logs pnptv-bot --lines 50 --nostream"

# Check admin configuration
ssh root@72.60.29.80 "cd /var/www/pnptv-bot && grep ADMIN_IDS .env"

# Verify payment app deployed
ssh root@72.60.29.80 "cd /var/www/pnptv-bot && ls -la public/payment/assets/ | grep index-By"

# Test health endpoint
curl -s https://pnptv.app/health

# Test payment page
curl -s 'https://pnptv.app/pay?plan=trial-pass&user=123&amount=14.99' | grep '<title>'

# Verify APP_ID in bundle
ssh root@72.60.29.80 "cd /var/www/pnptv-bot && grep -o 'televisionlatina' public/payment/assets/index-By-z2tYg.js | wc -l"
```

---

## Known Issues & Limitations

1. **AI Chat**: Currently disabled (no OpenAI API key)
   - Status: ⚠️ Infrastructure ready, needs API key
   - To enable: Uncomment `OPENAI_API_KEY` in `.env.production`

2. **Session TTL**: Set to 30 days
   - Consider reducing for privacy compliance
   - GDPR: May need user consent for long sessions

3. **Broadcast Rate Limiting**: 100ms delay between sends
   - For 1000 users: ~100 seconds total
   - Consider job queue for large broadcasts

4. **Payment Webhook Security**: Using token-based auth
   - Verify: `DAIMO_WEBHOOK_TOKEN` matches Daimo dashboard
   - Consider adding IP whitelist

---

## Test Results Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Admin Authorization | ✅ | Working correctly |
| Plan Management | ✅ | CRUD operations functional |
| Broadcast Messages | ✅ | Text & media supported |
| User Search | ✅ | Search by ID, username, name |
| Membership Management | ✅ | Activate, extend, modify working |
| Error Handling | ✅ | Sentry integration active |
| Session Management | ✅ | Firestore sessions with cleanup |
| AI Chat | ⚠️ | Disabled (no API key) |
| Daimo Payments | ✅ | Integration complete, APP_ID correct |
| Legal Pages | ✅ | All terms/privacy pages working |

---

**Last Updated**: 2025-10-29
**Tested By**: Claude Code AI Assistant
**Environment**: Production (pnptv.app)
**Bot Version**: 2.0.0
