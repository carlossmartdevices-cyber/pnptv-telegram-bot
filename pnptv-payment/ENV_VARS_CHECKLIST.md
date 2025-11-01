# Environment Variables Checklist

## Generate Required Secrets

### 1. WEBHOOK_SECRET
```bash
openssl rand -hex 32
# Copy the output below
WEBHOOK_SECRET=<paste_here>
```

### 2. Get Daimo Address
```
NEXT_PUBLIC_RECIPIENT_ADDRESS=<your_daimo_wallet_address>
```

### 3. Firebase Credentials

Go to: https://console.firebase.google.com

1. Select your project
2. ⚙️ Settings → Project Settings
3. Service Accounts tab
4. "Generate New Private Key"
5. Copy values:

```
FIREBASE_PROJECT_ID=<from_json>
FIREBASE_CLIENT_EMAIL=<from_json>
FIREBASE_PRIVATE_KEY=<from_json_with_\n>
FIREBASE_DATABASE_URL=https://<project>.firebaseio.com
```

**⚠️ IMPORTANT:** When pasting FIREBASE_PRIVATE_KEY into Vercel:
- Copy the raw key with newlines
- Vercel will handle escaping automatically
- Do NOT manually escape newlines

### 4. Sentry Configuration (Optional but Recommended)

Go to: https://sentry.io

1. Create account/project
2. Select Next.js as platform
3. Get DSN:

```
NEXT_PUBLIC_SENTRY_DSN=https://<key>@<domain>.ingest.sentry.io/<id>
```

Generate auth token:
https://sentry.io/settings/account/tokens/

```
SENTRY_AUTH_TOKEN=<your_token>
```

---

## Vercel Environment Variables - Complete List

### Required for Payment Processing
- [ ] NEXT_PUBLIC_RECIPIENT_ADDRESS
- [ ] FIREBASE_PROJECT_ID
- [ ] FIREBASE_CLIENT_EMAIL
- [ ] FIREBASE_PRIVATE_KEY
- [ ] FIREBASE_DATABASE_URL
- [ ] WEBHOOK_SECRET
- [ ] NODE_ENV = production

### Optional for Monitoring
- [ ] NEXT_PUBLIC_SENTRY_DSN (recommended)
- [ ] SENTRY_AUTH_TOKEN

---

## How to Add to Vercel

### Option 1: Dashboard (Recommended for First Time)
1. https://vercel.com/dashboard
2. Select "pnptv-payment" project
3. Settings tab
4. Environment Variables
5. For each variable:
   - Name: VARIABLE_NAME
   - Value: your_value
   - Select "Production"
   - Click "Add"
6. After adding all, redeploy

### Option 2: CLI (Faster for Updates)
```bash
vercel env add NEXT_PUBLIC_RECIPIENT_ADDRESS
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_CLIENT_EMAIL
vercel env add FIREBASE_PRIVATE_KEY
vercel env add FIREBASE_DATABASE_URL
vercel env add WEBHOOK_SECRET
vercel env add NODE_ENV
vercel env add NEXT_PUBLIC_SENTRY_DSN  # Optional

# Then redeploy with new vars
vercel --prod
```

---

## Validation Before Deploy

- [ ] All required variables filled in
- [ ] FIREBASE_PRIVATE_KEY has correct format
- [ ] WEBHOOK_SECRET is 64+ hex characters
- [ ] NODE_ENV = "production"
- [ ] NEXT_PUBLIC_RECIPIENT_ADDRESS is valid Daimo address
- [ ] Build passes: `npm run build`
- [ ] No TypeScript errors: `npm run type-check`

---

## Post-Deploy Verification

- [ ] App loads: https://your-project.vercel.app
- [ ] No 5xx errors in logs
- [ ] Payment button displays
- [ ] Firebase connection works
- [ ] Webhook receiving payloads (if testing)
- [ ] Sentry capturing events (if configured)

---

## Quick Copy-Paste Template

Create a text file and fill in values, then add to Vercel:

```
NEXT_PUBLIC_RECIPIENT_ADDRESS=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_DATABASE_URL=
WEBHOOK_SECRET=
NODE_ENV=production
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

---

## Troubleshooting

**Build fails with FIREBASE_PRIVATE_KEY error:**
- Check private key has proper escaping
- Paste raw from Firebase JSON (Vercel handles escaping)

**Payment button not working:**
- Check NEXT_PUBLIC_RECIPIENT_ADDRESS is set
- Verify it's accessible in client-side console

**Webhook not processing:**
- Check WEBHOOK_SECRET is set
- Verify Firebase credentials are correct
- Check logs: `vercel logs --prod`

**Sentry not capturing errors:**
- Check NEXT_PUBLIC_SENTRY_DSN is correct
- Create Sentry project first
- May need to trigger error to test

---

**Last Updated:** October 31, 2025