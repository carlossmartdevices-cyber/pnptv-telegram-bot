# 🚀 QUICK START: Go Live in 5 Minutes

## Your App is Live! 🎉

**URL**: https://pnptv-payment-9lx3oqtgp-pnptvbots-projects.vercel.app

---

## Step 1: Get Your Credentials (2 min)

### 1a. Generate Webhook Secret
```bash
openssl rand -hex 32
```
Copy the output. You'll need it in Step 2.

### 1b. Get Firebase Credentials
1. Open https://console.firebase.google.com
2. Select your project
3. Click ⚙️ → Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file

From the JSON file, you'll need:
- `project_id`
- `client_email`
- `private_key`
- `database_url`

### 1c. Get Daimo Wallet Address
Your wallet address (starts with 0x)

---

## Step 2: Add to Vercel (2 min)

### Using CLI (Recommended)
```bash
cd /root/Bots/pnptv-payment

# Follow the prompts - paste each value
vercel env add NEXT_PUBLIC_RECIPIENT_ADDRESS
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_CLIENT_EMAIL
vercel env add FIREBASE_PRIVATE_KEY
vercel env add FIREBASE_DATABASE_URL
vercel env add WEBHOOK_SECRET
```

### Or Use Dashboard
1. https://vercel.com/dashboard
2. Click **pnptv-payment**
3. Settings → Environment Variables
4. Add each variable from Step 1

---

## Step 3: Redeploy (1 min)

```bash
vercel --prod
```

Wait for deployment to complete (~7 seconds).

---

## Step 4: Test (0 min)

Visit: https://pnptv-payment-9lx3oqtgp-pnptvbots-projects.vercel.app

You should see the payment button! 🎉

---

## Troubleshooting

**Button not appearing?**
```bash
vercel logs --prod
```

**Webhook not processing?**
- Check WEBHOOK_SECRET is set
- Verify Daimo Pay webhook settings

**Firebase error?**
- Verify all 4 Firebase variables are correct
- Check they use exact values from Firebase JSON

---

## Done!

Your payment system is now **PRODUCTION READY** ✅

For more details, see:
- `ENV_SETUP_VERCEL.md` - Full setup instructions
- `DEPLOYMENT_STATUS.md` - Current status
- `MONITORING_SETUP.md` - Optional: Set up Sentry
