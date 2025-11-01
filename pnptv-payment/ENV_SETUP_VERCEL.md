# 🔐 Environment Variables Setup for Vercel

Your app is deployed at: **https://pnptv-payment-9lx3oqtgp-pnptvbots-projects.vercel.app**

## Step 1: Prepare Your Credentials

### Generate WEBHOOK_SECRET
```bash
openssl rand -hex 32
```
**Save this output** - you'll need it in Step 2.

### Get Firebase Credentials
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Settings (⚙️) → Service Accounts
4. Generate new private key
5. You'll get a JSON file with these values:
   - `project_id`
   - `client_email`
   - `private_key`
   - `database_url` (if using Realtime DB)

### Get Daimo Wallet Address
- This is your recipient address for payments
- Should be your Daimo wallet address

---

## Step 2: Add Environment Variables to Vercel

### Option A: Using Vercel CLI (Recommended)
```bash
# Run this in the pnptv-payment directory
vercel env add NEXT_PUBLIC_RECIPIENT_ADDRESS
# Paste your Daimo wallet address, press Enter

vercel env add FIREBASE_PROJECT_ID
# Paste your Firebase project ID, press Enter

vercel env add FIREBASE_CLIENT_EMAIL
# Paste your Firebase client email, press Enter

vercel env add FIREBASE_PRIVATE_KEY
# Paste your Firebase private key (the long one), press Enter

vercel env add FIREBASE_DATABASE_URL
# Paste your Firebase database URL, press Enter

vercel env add WEBHOOK_SECRET
# Paste the output from openssl rand -hex 32, press Enter
```

Then redeploy:
```bash
vercel --prod
```

### Option B: Using Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **pnptv-payment** project
3. Settings → Environment Variables
4. Click "Add New"
5. Add each variable:

| Variable | Value | Target |
|----------|-------|--------|
| `NEXT_PUBLIC_RECIPIENT_ADDRESS` | Your Daimo wallet | Production |
| `FIREBASE_PROJECT_ID` | From Firebase | Production |
| `FIREBASE_CLIENT_EMAIL` | From Firebase | Production |
| `FIREBASE_PRIVATE_KEY` | From Firebase | Production |
| `FIREBASE_DATABASE_URL` | From Firebase | Production |
| `WEBHOOK_SECRET` | From `openssl rand -hex 32` | Production |

6. After adding all, click Deployments → Redeploy to latest

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_RECIPIENT_ADDRESS` | Daimo wallet to receive payments | `0x1234...abcd` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `pnptv-payment` |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | `firebase-adminsdk-xxx@pnptv-payment.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Firebase private key | `-----BEGIN PRIVATE KEY-----\n...` |
| `FIREBASE_DATABASE_URL` | Firebase database URL | `https://pnptv-payment.firebaseio.com` |
| `WEBHOOK_SECRET` | Secret for webhook verification | `(from openssl)` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking DSN | Not set |
| `NODE_ENV` | Environment | `production` (auto-set) |

---

## Step 3: Verify Deployment

### Check Variables Were Added
```bash
vercel env ls
```

Should show all your variables (values hidden).

### Test the App
```bash
# After redeploy completes, visit:
# https://pnptv-payment-9lx3oqtgp-pnptvbots-projects.vercel.app
```

You should see the payment button. If you get an error:
- Check Vercel logs: `vercel logs --prod`
- Verify Firebase credentials are correct
- Ensure WEBHOOK_SECRET is set

### Check Logs
```bash
vercel logs --prod
```

Look for any errors related to Firebase or webhooks.

---

## Step 4: Configure Daimo Pay Webhook (Optional but Recommended)

1. Go to Daimo Pay settings
2. Add Webhook URL: `https://pnptv-payment-9lx3oqtgp-pnptvbots-projects.vercel.app/api/webhook`
3. Add Webhook Secret: (the value you generated with `openssl rand -hex 32`)
4. Save

---

## Step 5: Test Payment Flow

1. Visit: https://pnptv-payment-9lx3oqtgp-pnptvbots-projects.vercel.app
2. Click "Pay with Daimo"
3. Complete payment in Daimo app
4. Should see success page
5. Check Firebase console - you should see subscription record

---

## Troubleshooting

### "Firebase not initialized" Error
- Firebase credentials not in environment variables
- Check: `vercel env ls` shows all Firebase vars
- Redeploy after adding variables

### "Invalid signature" Error
- WEBHOOK_SECRET doesn't match Daimo settings
- Regenerate with: `openssl rand -hex 32`
- Update both in Vercel AND Daimo Pay

### "Payment button not loading"
- Check NEXT_PUBLIC_RECIPIENT_ADDRESS is set
- Verify it's a valid Daimo wallet address
- Check browser console for errors (F12)

### "Subscription not recorded"
- Firebase credentials might be invalid
- Check Vercel logs: `vercel logs --prod`
- Verify Firebase project is active
- Ensure Firestore database exists

---

## Security Notes

✅ All credentials stored securely in Vercel  
✅ Private keys never exposed in frontend  
✅ Webhook signature verification enabled  
✅ Rate limiting active (10 req/min per IP)  
✅ Environment variables protected  

---

## Next Steps

1. ✅ Add all environment variables
2. ✅ Redeploy with: `vercel --prod`
3. ✅ Test payment flow
4. ✅ (Optional) Set up Sentry for error tracking
5. ✅ Monitor Vercel Analytics

---

## Need Help?

- **Vercel Docs**: https://vercel.com/docs/projects/environment-variables
- **Firebase Docs**: https://firebase.google.com/docs/admin/setup
- **Check Logs**: `vercel logs --prod`
- **Inspect URL**: https://vercel.com/pnptvbots-projects/pnptv-payment

---

**Status**: 🟡 Awaiting environment variables  
**Next Action**: Add environment variables and redeploy  
**Deployment URL**: https://pnptv-payment-9lx3oqtgp-pnptvbots-projects.vercel.app
