# 🚀 Quick Start Guide - PNPtv Payment System

## Prerequisites
- Node.js 20+ installed
- Firebase project created
- Daimo Pay account with wallet address

## Installation (2 minutes)

```bash
cd pnptv-payment
npm install
cp .env.example .env.local
```

## Configuration (5 minutes)

Edit `.env.local` with your values:

```env
# Get from Daimo Pay
NEXT_PUBLIC_RECIPIENT_ADDRESS=your_daimo_address

# Get from Firebase Console > Project Settings > Service Accounts
FIREBASE_PROJECT_ID=your_id
FIREBASE_CLIENT_EMAIL=your_email@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=your_key_here
FIREBASE_DATABASE_URL=your_database_url

# Generate with: openssl rand -hex 32
WEBHOOK_SECRET=your_secret_key
```

## Local Development

```bash
npm run dev
# Open http://localhost:3000
```

## Production Build

```bash
npm run build
npm start
```

## Deploy to Vercel (1 click)

```bash
npm i -g vercel
vercel --prod
```

Then add environment variables in Vercel Dashboard.

## Test Payment Flow

1. Go to http://localhost:3000
2. Click "Pay with Daimo"
3. Complete payment
4. See success animation
5. Check Firebase for data

## Troubleshooting

**Build fails**: Check Node version is 20+
```bash
node --version  # Should be v20+
```

**TypeScript errors**: Run type check
```bash
npm run type-check
```

**Payment not working**: Verify environment variables are set

## Documentation

- Full guide: See `README.md`
- Deployment: See `DEPLOYMENT_CHECKLIST.md`
- Summary: See `PRODUCTION_SUMMARY.md`

## Support

Check the appropriate documentation file for your need:
- Deployment: `DEPLOYMENT_CHECKLIST.md`
- Features: `README.md`
- Architecture: `PRODUCTION_SUMMARY.md`

---

**Status**: ✅ Ready to deploy!
