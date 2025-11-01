# Complete Environment Variables Reference

## Production Environment - All Required & Optional Variables

### 1. PAYMENT PROCESSING (Required)
```
NEXT_PUBLIC_RECIPIENT_ADDRESS=<your_daimo_wallet_address>
  Description: Your Daimo wallet address for receiving payments
  Example: 0x1234567890abcdef1234567890abcdef12345678
  Type: Public (can be exposed in frontend)
```

### 2. FIREBASE CONFIGURATION (Required)
```
FIREBASE_PROJECT_ID=your-project-id
  Description: Your Firebase project ID
  Example: my-app-12345
  Type: Private

FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
  Description: Firebase service account email
  Type: Private

FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQI...\n-----END PRIVATE KEY-----"
  Description: Firebase private key (IMPORTANT: Keep newlines escaped with \n)
  Type: Private (SENSITIVE - Never commit to git)
  Note: When pasting into Vercel, use the raw JSON format without extra escaping

FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
  Description: Firebase Realtime Database URL
  Type: Private
```

### 3. SECURITY (Required)
```
WEBHOOK_SECRET=<randomly_generated_hex_string>
  Description: Secret key for webhook signature verification
  Generate with: openssl rand -hex 32
  Example: a1b2c3d4e5f6...
  Type: Private (SENSITIVE)
```

### 4. DEPLOYMENT & ENVIRONMENT (Required)
```
NODE_ENV=production
  Description: Node environment
  Options: development, staging, production
  Type: Public
```

### 5. MONITORING - SENTRY (Optional but Recommended)
```
NEXT_PUBLIC_SENTRY_AUTH_TOKEN=<your_sentry_auth_token>
  Description: Sentry authentication token for error tracking
  Get from: https://sentry.io/settings/account/tokens/
  Type: Private (rarely needed in Vercel, mainly for build process)

NEXT_PUBLIC_SENTRY_DSN=https://<key>@<organization>.ingest.sentry.io/<projectid>
  Description: Sentry DSN for error tracking
  Get from: Sentry project settings
  Type: Public (safe to expose in frontend for error collection)

SENTRY_ORG=<your_organization_slug>
  Description: Sentry organization name
  Type: Private

SENTRY_PROJECT=<your_project_slug>
  Description: Sentry project name
  Type: Private

SENTRY_AUTH_TOKEN=<sentry_auth_token_for_build>
  Description: For building source maps and uploading to Sentry
  Type: Private (SENSITIVE)
```

### 6. MONITORING - VERCEL (Optional)
```
Vercel includes built-in monitoring:
  - Web Analytics (automatic)
  - Performance Monitoring (automatic)
  - Error Tracking (with Vercel Functions)
  No configuration needed - enabled by default
```

### 7. OPTIONAL: CLIENT-SIDE FIREBASE (Optional)
```
NEXT_PUBLIC_FIREBASE_API_KEY=<your_api_key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your_sender_id>
NEXT_PUBLIC_FIREBASE_APP_ID=<your_app_id>
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=<your_measurement_id>
  Description: For client-side Firebase Analytics (not currently used)
  Type: Public
```

---

## Step-by-Step Setup Instructions

### A. GENERATE REQUIRED SECRETS

#### Generate WEBHOOK_SECRET:
```bash
openssl rand -hex 32
# Output: a1b2c3d4e5f6g7h8i9j0... (copy this)
```

#### Get Firebase Credentials:
1. Go to https://console.firebase.google.com
2. Select your project
3. Settings (gear icon) → Project Settings
4. Service Accounts tab
5. Click "Generate New Private Key"
6. Copy the JSON and extract:
   - project_id → FIREBASE_PROJECT_ID
   - client_email → FIREBASE_CLIENT_EMAIL
   - private_key → FIREBASE_PRIVATE_KEY (with \n for newlines)

#### Get Daimo Address:
- Use your Daimo wallet address from the app

---

### B. CREATE SENTRY ACCOUNT & GET DSN

1. Go to https://sentry.io
2. Sign up (free tier available)
3. Create new project → Select "Next.js"
4. Get your DSN (looks like https://xxxxx@xxxxx.ingest.sentry.io/xxxxx)

---

### C. DEPLOY TO VERCEL

#### Option 1: Using Vercel CLI (Recommended)
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Navigate to project
cd /root/Bots/pnptv-payment

# 3. Deploy (link your GitHub account if prompted)
vercel

# 4. When asked about project settings, accept defaults
# 5. Set environment variables via CLI or dashboard

# 6. Set env vars via Vercel CLI
vercel env add NEXT_PUBLIC_RECIPIENT_ADDRESS
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_CLIENT_EMAIL
vercel env add FIREBASE_PRIVATE_KEY
vercel env add FIREBASE_DATABASE_URL
vercel env add WEBHOOK_SECRET
vercel env add NODE_ENV
# (repeat for any other vars)

# 7. Redeploy with new env vars
vercel --prod
```

#### Option 2: Using Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Select your GitHub repo (or connect GitHub first)
4. Click "Import"
5. In "Environment Variables" section, add all required vars
6. Click "Deploy"

---

### D. SET UP SENTRY MONITORING

#### 1. Install Sentry in project:
```bash
cd /root/Bots/pnptv-payment
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

#### 2. Configure Sentry (creates sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts):
- When prompted, enter your Sentry DSN
- Accept defaults for other options

#### 3. Add Sentry env vars to Vercel:
- NEXT_PUBLIC_SENTRY_DSN (get from Sentry dashboard)
- SENTRY_AUTH_TOKEN (for source maps)

#### 4. Test Sentry:
```bash
npm run dev
# Visit page with console open
# Trigger error to test (or add test button)
```

---

## Environment Variables by Deployment Platform

### Vercel Dashboard
1. Project Settings
2. Environment Variables
3. Add each variable (select "Production" for production-only vars)
4. Redeploy

### Vercel CLI
```bash
vercel env add VARIABLE_NAME
vercel env add VARIABLE_NAME --prod  # Production only
vercel env ls                         # List all
vercel env pull                       # Download to .env.local
```

---

## Validation Checklist

Before deploying to production:

- [ ] NEXT_PUBLIC_RECIPIENT_ADDRESS is valid Daimo address
- [ ] FIREBASE_PROJECT_ID matches your Firebase project
- [ ] FIREBASE_PRIVATE_KEY has escaped newlines (\n)
- [ ] WEBHOOK_SECRET is 64+ hex characters
- [ ] NODE_ENV is set to "production"
- [ ] SENTRY_DSN configured (if using Sentry)
- [ ] All required vars are in Vercel (not just .env.local)
- [ ] Build passes: `npm run build`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] Test webhook signature verification works
- [ ] Test payment flow end-to-end

---

## Production Deployment Checklist

### Pre-Deploy
- [ ] Code is committed and pushed to GitHub
- [ ] All tests passing locally
- [ ] .env.local removed or in .gitignore
- [ ] .env.example is up to date

### During Deploy (Vercel)
- [ ] All env vars added to Vercel dashboard
- [ ] Production build succeeds
- [ ] No errors in Vercel build logs

### Post-Deploy
- [ ] Visit deployed URL and test UI loads
- [ ] Test payment button (may need test account)
- [ ] Check Sentry is receiving events
- [ ] Verify Firebase data being written
- [ ] Monitor logs for 24 hours

---

## Monitoring Dashboards

### Sentry
- Dashboard: https://sentry.io
- View errors, performance, releases
- Set up alerts for critical errors

### Vercel
- Dashboard: https://vercel.com/dashboard
- View deployments, logs, analytics
- Built-in Web Analytics enabled

### Firebase
- Console: https://console.firebase.google.com
- View Firestore data, subscription records
- Monitor real-time database activity