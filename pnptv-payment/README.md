# PNPtv Payment System

A secure, production-ready payment integration for PNPtv using Daimo Pay and Next.js.

## Features

✅ Secure payment processing with Daimo Pay  
✅ Real-time payment status updates  
✅ Firebase integration for subscription management  
✅ Webhook handling with signature verification  
✅ Rate limiting and security measures  
✅ Error handling and user feedback  
✅ Responsive UI with loading states  
✅ Production-optimized build  

## Quick Start

### Prerequisites

- Node.js 20+ (required for Next.js 16)
- npm or yarn
- Firebase project with service account credentials
- Daimo Pay account and wallet address

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/your-username/pnptv-payment.git
cd pnptv-payment
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env.local
```

4. **Configure your `.env.local` file:**

Edit `.env.local` and add your credentials:

```env
# Daimo Pay Configuration
NEXT_PUBLIC_RECIPIENT_ADDRESS=your_daimo_wallet_address

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Security
WEBHOOK_SECRET=your_webhook_secret_here

# Environment
NODE_ENV=production
```

### Getting Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Copy the credentials from the downloaded JSON file

### Development

Start the development server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Production Build

Create an optimized production build:

```bash
npm run build
npm start
```

## Deployment

### Deploy to Vercel (Recommended)

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Deploy:**
```bash
vercel
```

3. **Set environment variables in Vercel Dashboard:**
   - Go to Project Settings → Environment Variables
   - Add all variables from your `.env.local`

4. **Configure webhook URL:**
  - Your webhook URL will be: `https://pnptv-payment-9lx3oqtgp-pnptvbots-projects.vercel.app/api/webhook`
   - Add this to your Daimo Pay webhook settings

### Deploy to Other Platforms

The project is compatible with any platform that supports Node.js 20+:

- Heroku
- Railway
- Render
- AWS Amplify
- DigitalOcean

## API Endpoints

### POST /api/webhook

Handles payment notifications from Daimo Pay.

**Headers:**
- `x-daimo-signature`: Webhook signature for verification

**Request Body:**
```json
{
  "userId": "string",
  "amount": "number",
  "status": "string",
  "transactionId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "string"
}
```

### POST /api/payment/verify

Verifies payment eligibility before processing.

**Request Body:**
```json
{
  "amount": "string",
  "userId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verification successful"
}
```

## Security Features

- ✅ HMAC-SHA256 webhook signature verification
- ✅ Rate limiting (10 requests per minute per IP)
- ✅ Input validation and sanitization
- ✅ Secure environment variable handling
- ✅ CORS configuration
- ✅ Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ Secure password storage in Firebase
- ✅ No sensitive data logged

## Project Structure

```
pnptv-payment/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── webhook/
│   │   │   │   └── route.ts         # Daimo Pay webhook handler
│   │   │   └── payment/
│   │   │       └── verify/
│   │   │           └── route.ts     # Payment verification endpoint
│   │   ├── layout.tsx               # Root layout with PaymentProvider
│   │   ├── page.tsx                 # Main payment page
│   │   ├── success/
│   │   │   └── page.tsx             # Success page
│   │   └── globals.css              # Global styles
│   ├── components/
│   │   ├── DaimoPayButton.tsx       # Payment button component
│   │   ├── PaymentSuccess.tsx       # Success animation
│   │   └── ErrorToast.tsx           # Error notification
│   ├── context/
│   │   └── PaymentContext.tsx       # Payment state management
│   ├── lib/
│   │   └── firebase.ts              # Firebase configuration
│   └── utils/
│       └── analytics.ts             # Analytics tracking
├── public/
│   ├── manifest.json                # PWA manifest
│   └── sw.js                        # Service worker
├── .env.example                     # Environment variables template
├── .env.local                       # Local environment variables (gitignored)
├── next.config.js                   # Next.js configuration
├── tsconfig.json                    # TypeScript configuration
├── tailwind.config.js               # Tailwind CSS configuration
├── vercel.json                      # Vercel deployment configuration
└── package.json                     # Project dependencies

```

## Testing

To test the payment flow:

1. Start the development server
2. Navigate to the home page
3. Click "Pay with Daimo"
4. Complete the payment in the Daimo Pay interface
5. You should see a success animation
6. Check Firebase to confirm subscription was created

## Troubleshooting

### Build Errors

If you encounter TypeScript errors during build:

```bash
npm run type-check
```

### Payment Not Processing

1. Check that `NEXT_PUBLIC_RECIPIENT_ADDRESS` is set correctly
2. Verify webhook signature verification is passing
3. Check Firebase credentials are valid
4. Review API logs in Vercel dashboard

### Webhook Not Triggering

1. Verify webhook URL is correct in Daimo Pay settings
2. Check webhook secret matches `WEBHOOK_SECRET` environment variable
3. Review webhook logs in Daimo Pay dashboard
4. Ensure rate limit is not being triggered

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| NEXT_PUBLIC_RECIPIENT_ADDRESS | ✅ | Your Daimo wallet address |
| FIREBASE_PROJECT_ID | ✅ | Firebase project ID |
| FIREBASE_CLIENT_EMAIL | ✅ | Firebase service account email |
| FIREBASE_PRIVATE_KEY | ✅ | Firebase private key |
| FIREBASE_DATABASE_URL | ✅ | Firebase database URL |
| WEBHOOK_SECRET | ✅ | Secret for webhook verification |
| NODE_ENV | ✅ | Environment (production/development) |

## Performance Optimization

The application includes:

- ✅ Image optimization
- ✅ Code splitting
- ✅ CSS minification
- ✅ JavaScript minification
- ✅ Caching strategies
- ✅ Server-side rendering

## Monitoring

For production monitoring:

1. **Sentry** - Error tracking
2. **Vercel Analytics** - Performance monitoring
3. **Firebase Console** - Subscription data

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review API logs in your deployment platform
3. Check Firebase Console for data issues
4. Contact Daimo Pay support for payment issues

## License

MIT License

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

**Last Updated:** October 31, 2025  
**Version:** 1.0.0  
**Status:** Production Ready

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
