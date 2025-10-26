# Manual Deployment Guide (For Coder/SSH environments)

Since automated Railway login requires a browser, use this manual approach:

## Step 1: Build Payment App First

```bash
cd payment-app
npm install
npm run build
cd ..
```

## Step 2: Deploy via Railway Dashboard

### Option A: Railway Dashboard (Easiest)

1. **Go to Railway**: https://railway.app
2. **Create New Project** → "Deploy from GitHub repo"
3. **Connect GitHub**: Authorize Railway to access your repos
4. **Select Repository**: Choose your bot repository
5. **Configure**: Railway will auto-detect Node.js

### Option B: Railway CLI with Token

If you have Railway API token:

```bash
# Set token
export RAILWAY_TOKEN=your_token_here

# Login with token (non-interactive)
railway login --browserless

# Continue with deployment
railway init
railway up
```

To get a Railway token:
1. Go to https://railway.app/account/tokens
2. Create new token
3. Copy and use above

## Step 3: Set Environment Variables in Railway Dashboard

Go to your Railway project → Variables tab and add:

```
TELEGRAM_TOKEN=your_bot_token
ADMIN_IDS=your_admin_id
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CREDENTIALS={"type":"service_account",...}
CHANNEL_ID=your_channel_id
DAIMO_APP_ID=pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw
DAIMO_WEBHOOK_TOKEN=your_webhook_token
VITE_DAIMO_APP_ID=pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw
VITE_TREASURY_ADDRESS=0xYourAddress
VITE_REFUND_ADDRESS=0xYourAddress
VITE_SETTLEMENT_CHAIN=10
VITE_SETTLEMENT_TOKEN=0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
PORT=3000
NODE_ENV=production
```

## Step 4: Get Deployment URL

After deployment:
1. Go to Railway project → Settings → Domains
2. Click "Generate Domain"
3. Copy the URL (e.g., `https://your-app.up.railway.app`)

## Step 5: Update URL Variables

Add these in Railway Variables:

```
BOT_URL=https://your-app.up.railway.app
PAYMENT_PAGE_URL=https://your-app.up.railway.app/pay
```

Then redeploy (Railway will auto-redeploy when you change variables).

## Step 6: Configure Webhooks

### Daimo
1. Go to https://pay.daimo.com/dashboard
2. Add webhook: `https://your-app.up.railway.app/daimo/webhook`
3. Copy webhook token
4. Add to Railway Variables: `DAIMO_WEBHOOK_TOKEN=your_token`

### ePayco (if using)
1. Go to ePayco dashboard
2. Set URLs:
   - Response: `https://your-app.up.railway.app/epayco/response`
   - Confirmation: `https://your-app.up.railway.app/epayco/confirmation`

Done! ✅
