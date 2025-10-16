# Railway Environment Variables Setup

## ⚠️ IMPORTANT: Configure These Before Testing Payments

Your bot needs these environment variables configured in Railway to process payments.

## 🔑 Required Variables for Railway

Copy and paste each of these into Railway's Variables section:

### 1. Telegram Bot Configuration

```
TELEGRAM_TOKEN=your_telegram_bot_token_here
ADMIN_IDS=your_telegram_user_id_here
```

**How to get:**
- TELEGRAM_TOKEN: From @BotFather when you created the bot
- ADMIN_IDS: Your Telegram user ID (you can get it from @userinfobot)

---

### 2. Firebase Configuration

```
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

**Important:**
- FIREBASE_CREDENTIALS must be a single line JSON (no line breaks)
- Get it from Firebase Console → Project Settings → Service Accounts → Generate New Private Key

---

### 3. ePayco Payment Gateway (✅ YOUR CREDENTIALS)

```
EPAYCO_PUBLIC_KEY=881ddf8418549218fe2f227458f2f59c
EPAYCO_PRIVATE_KEY=80174d93a6f8d760f5cca2b2cc6ee48b
EPAYCO_P_CUST_ID=1555482
EPAYCO_P_KEY=e76ae8e9551df6e3b353434c4de34ef2dafa41bf
EPAYCO_TEST_MODE=true
```

**Note:** These are your real credentials from ePayco dashboard. Keep `EPAYCO_TEST_MODE=true` for testing with sandbox.

---

### 4. Webhook URLs

```
EPAYCO_RESPONSE_URL=https://pnptv-telegram-bot-production.up.railway.app/epayco/response
EPAYCO_CONFIRMATION_URL=https://pnptv-telegram-bot-production.up.railway.app/epayco/confirmation
BOT_URL=https://pnptv-telegram-bot-production.up.railway.app
WEB_APP_URL=https://pnptv-telegram-bot-production.up.railway.app
```

**Important:** Replace `pnptv-telegram-bot-production.up.railway.app` with your actual Railway domain if it's different.

---

### 5. Server Configuration

```
PORT=3000
WEB_PORT=3000
```

Railway will override PORT automatically, but these are good defaults.

---

## 📋 Step-by-Step Configuration in Railway

### Step 1: Access Railway Dashboard

1. Go to: https://railway.app/
2. Login to your account
3. Select your project (pnptv-telegram-bot-production)
4. Click on your service

### Step 2: Open Variables Tab

1. Click on the **Variables** tab
2. You'll see a list of current variables (if any)

### Step 3: Add Each Variable

For each variable above:

1. Click **+ New Variable** button
2. Enter the **Variable Name** (e.g., `EPAYCO_PUBLIC_KEY`)
3. Enter the **Value** (e.g., `881ddf8418549218fe2f227458f2f59c`)
4. Click **Add**

### Step 4: Special Care for FIREBASE_CREDENTIALS

This one is tricky because it's JSON:

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Go to Project Settings → Service Accounts
4. Click "Generate new private key"
5. Open the downloaded JSON file
6. **Remove ALL line breaks** - make it a single line
7. Paste as the value for `FIREBASE_CREDENTIALS`

**Example:**
```json
{"type":"service_account","project_id":"your-project","private_key":"-----BEGIN PRIVATE KEY-----\nYour_Key_Here\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk@your-project.iam.gserviceaccount.com"}
```

### Step 5: Verify All Variables Are Set

After adding all variables, you should see:

✅ TELEGRAM_TOKEN
✅ ADMIN_IDS
✅ FIREBASE_PROJECT_ID
✅ FIREBASE_CREDENTIALS
✅ EPAYCO_PUBLIC_KEY
✅ EPAYCO_PRIVATE_KEY
✅ EPAYCO_P_CUST_ID
✅ EPAYCO_P_KEY
✅ EPAYCO_TEST_MODE
✅ EPAYCO_RESPONSE_URL
✅ EPAYCO_CONFIRMATION_URL
✅ BOT_URL
✅ WEB_APP_URL
✅ PORT
✅ WEB_PORT

### Step 6: Redeploy (if needed)

Railway usually redeploys automatically when you change variables. If not:

1. Go to **Deployments** tab
2. Click **Deploy** button
3. Wait for deployment to complete (2-3 minutes)

---

## 🧪 Verification After Configuration

### Test 1: Check if bot is running

Open Telegram and send `/start` to your bot.

Expected: Bot responds with welcome message.

---

### Test 2: Check health endpoint

```bash
curl https://pnptv-telegram-bot-production.up.railway.app/epayco/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "epayco-webhook",
  "timestamp": "2025-..."
}
```

---

### Test 3: Check debug endpoint

```bash
curl https://pnptv-telegram-bot-production.up.railway.app/debug/test-payment
```

Expected: JSON response with payment URL or error details.

If you see an error, check the Railway logs for details.

---

### Test 4: Try to create a payment from bot

1. Open bot in Telegram
2. Click **Subscribe**
3. Select **Silver** or **Golden**
4. You should see payment details
5. Click **💳 Ir a Pagar** button
6. Should open ePayco checkout page

---

## 🐛 Troubleshooting

### Error: "Payment gateway not configured"

**Cause:** Missing `EPAYCO_PUBLIC_KEY` variable

**Solution:**
1. Go to Railway Variables
2. Add `EPAYCO_PUBLIC_KEY=881ddf8418549218fe2f227458f2f59c`
3. Redeploy

---

### Error: "ePayco credentials not configured"

**Cause:** Missing ePayco variables

**Solution:** Make sure ALL these are set:
- EPAYCO_PUBLIC_KEY
- EPAYCO_PRIVATE_KEY
- EPAYCO_P_CUST_ID
- EPAYCO_P_KEY

---

### Error: "Expected property name or '}' in JSON"

**Cause:** FIREBASE_CREDENTIALS is not valid JSON

**Solution:**
1. Open the credentials JSON file
2. Remove ALL line breaks
3. Validate at: https://jsonlint.com/
4. Copy the single-line JSON
5. Update FIREBASE_CREDENTIALS in Railway

---

### Bot doesn't respond at all

**Cause:** TELEGRAM_TOKEN is wrong or missing

**Solution:**
1. Get token from @BotFather
2. Set TELEGRAM_TOKEN in Railway
3. Redeploy

---

### Payment link shows "Access Denied"

**Cause:** Wrong ePayco credentials or test mode mismatch

**Solution:**
1. Verify credentials are correct
2. Make sure EPAYCO_TEST_MODE=true for sandbox
3. Check Railway logs for errors

---

## 📊 Check Railway Logs

To see what's happening:

1. Go to Railway Dashboard
2. Select your service
3. Click **Logs** tab
4. Look for errors in red
5. Look for `[WEBHOOK]` or payment-related messages

Common log messages:

✅ **Good:**
```
Web server running on port 3000
Firebase initialized successfully
Creating ePayco payment link for user...
ePayco payment link created successfully
```

❌ **Bad:**
```
EPAYCO_PUBLIC_KEY not configured
Error parsing FIREBASE_CREDENTIALS
ePayco payment creation failed
```

---

## 🎯 Quick Copy-Paste Block for Railway

Here's everything in one block you can reference:

```env
# Telegram
TELEGRAM_TOKEN=your_token_from_botfather
ADMIN_IDS=your_telegram_user_id

# Firebase
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"..."}

# ePayco (Your Real Credentials)
EPAYCO_PUBLIC_KEY=881ddf8418549218fe2f227458f2f59c
EPAYCO_PRIVATE_KEY=80174d93a6f8d760f5cca2b2cc6ee48b
EPAYCO_P_CUST_ID=1555482
EPAYCO_P_KEY=e76ae8e9551df6e3b353434c4de34ef2dafa41bf
EPAYCO_TEST_MODE=true

# Webhook URLs (update domain if different)
EPAYCO_RESPONSE_URL=https://pnptv-telegram-bot-production.up.railway.app/epayco/response
EPAYCO_CONFIRMATION_URL=https://pnptv-telegram-bot-production.up.railway.app/epayco/confirmation
BOT_URL=https://pnptv-telegram-bot-production.up.railway.app
WEB_APP_URL=https://pnptv-telegram-bot-production.up.railway.app

# Server
PORT=3000
WEB_PORT=3000
```

---

## ✅ Final Checklist

Before testing payments, verify:

- [ ] All variables are added in Railway
- [ ] FIREBASE_CREDENTIALS is valid single-line JSON
- [ ] EPAYCO_TEST_MODE=true (for sandbox testing)
- [ ] Webhook URLs use your correct Railway domain
- [ ] Bot responds to /start in Telegram
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Checked Railway logs for errors

---

## 🚀 After Configuration

Once all variables are set and verified:

1. Test payment flow end-to-end
2. Use ePayco test card: `4575623182290326`
3. Complete a test payment
4. Verify membership is activated
5. Check you receive Telegram notification

When everything works in test mode:

```
EPAYCO_TEST_MODE=false
```

Then test with one real small payment before going fully live.

---

## 📞 Need Help?

If payments still don't work after configuration:

1. Check Railway logs for specific errors
2. Test debug endpoint: `/debug/test-payment`
3. Verify all variables are EXACTLY as shown above
4. Make sure no extra spaces or quotes in values
5. Check ePayco dashboard for any issues with your account

---

**Last Updated:** After receiving your credentials from ePayco dashboard.

**Status:** Ready to configure in Railway for testing.
