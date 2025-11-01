# Production Monitoring Setup Guide

## Overview

This guide covers setting up error tracking, performance monitoring, and logging for the PNPtv Payment System.

---

## 1. SENTRY ERROR TRACKING & PERFORMANCE MONITORING

### What is Sentry?
- **Error Tracking**: Automatically capture and track JavaScript errors
- **Performance Monitoring**: Track page load times, API responses, database queries
- **Session Replay**: Record user sessions to debug issues
- **Alert Management**: Set up alerts for critical errors

### Setup Steps

#### A. Create Sentry Project
1. Go to https://sentry.io
2. Sign up (free tier: 5k events/month)
3. Create organization → Create project
4. Select "Next.js" as platform
5. Get your DSN (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

#### B. Add Sentry to Vercel Environment Variables
1. Go to https://vercel.com/dashboard
2. Select your pnptv-payment project
3. Settings → Environment Variables
4. Add:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   ```

#### C. Generate Sentry Auth Token (for source maps)
1. Go to https://sentry.io/settings/account/tokens/
2. Create new token
3. Select "project:releases:create" and "org:read" scopes
4. Copy token
5. Add to Vercel:
   ```
   SENTRY_AUTH_TOKEN=<your_token>
   ```

#### D. Configure Sentry in Next.js
Files have been created:
- `sentry.client.config.ts` - Client-side error tracking
- `sentry.server.config.ts` - Server-side error tracking
- `sentry.edge.config.ts` - Edge function error tracking

#### E. Test Sentry Locally
```bash
cd /root/Bots/pnptv-payment
npm run dev
# Visit http://localhost:3000
# Add a test error button or trigger error in console
# Check Sentry dashboard for captured errors
```

### Sentry Features in This Setup

✅ **Error Tracking**
- Automatically captures unhandled errors
- Groups similar errors together
- Shows error frequency and affected users

✅ **Performance Monitoring**
- Tracks page load time
- Monitors API response times
- Captures slow requests

✅ **Session Replay** (10% of sessions + 100% with errors)
- Replay user sessions to debug issues
- See exactly what user was doing when error occurred

✅ **Environment Tracking**
- Separate development/production errors
- Easy to filter by environment

✅ **Alerts**
- Set up email/Slack alerts for critical errors
- Configure in Sentry dashboard: Settings → Alerts

---

## 2. VERCEL BUILT-IN MONITORING

### Web Analytics (Automatic)
- Tracks page views, user sessions
- Measures Core Web Vitals
- **No setup required** - enabled by default

### View Analytics
1. Go to https://vercel.com/dashboard
2. Select pnptv-payment project
3. Click "Analytics" tab
4. View metrics:
   - Requests per minute
   - Response times
   - Error rate

---

## 3. FIREBASE LOGGING & MONITORING

### View Firebase Logs
1. Go to https://console.firebase.google.com
2. Select your project
3. Build → Cloud Logging
4. View logs for:
   - Webhook execution
   - Subscription creation
   - Payment processing

### Database Monitoring
1. Build → Firestore
2. Monitor collections:
   - `subscriptions` - User subscription records
3. View real-time data updates

### Set Up Firebase Alerts
1. Settings → Integrations
2. Enable notifications for database quota warnings

---

## 4. PAYMENT WEBHOOK MONITORING

### Verify Webhook Signature
The webhook handler automatically verifies Daimo Pay signatures using HMAC-SHA256.

Logs are written to:
- **Console** (development): See in terminal running `npm run dev`
- **Vercel Logs** (production): https://vercel.com/dashboard → Functions

### Monitor Webhook in Production
```bash
vercel logs --prod
# Filter for /api/webhook
```

### Check Webhook Success Rate
1. Check Firebase for subscription records
2. Compare with Daimo Pay webhook dashboard
3. Look for failed signatures in Sentry errors

---

## 5. ENVIRONMENT-SPECIFIC MONITORING

### Development (npm run dev)
- Sentry captures 100% of transactions
- Errors logged to console
- Source maps available for debugging

### Production (Vercel)
- Sentry captures 10% of transactions (configurable)
- Errors sent to Sentry dashboard
- Session replay enabled for errors
- Vercel Analytics automatically tracked

### Staging (Optional)
```bash
# To test on staging:
# 1. Create staging environment in Vercel
# 2. Use different Sentry project for staging
# 3. Monitor separately from production
```

---

## 6. KEY MONITORING DASHBOARDS

### Primary Monitoring
| Dashboard | URL | What to Monitor |
|-----------|-----|-----------------|
| Sentry | https://sentry.io | Errors, performance, replays |
| Vercel | https://vercel.com/dashboard | Deployments, analytics, logs |
| Firebase | https://console.firebase.google.com | Data, logs, quota usage |

### Check These Regularly
1. **Sentry Issues Dashboard**
   - Are errors increasing?
   - Any new error types?
   - Performance within acceptable range?

2. **Vercel Analytics**
   - Response times
   - Error rates
   - Core Web Vitals

3. **Firebase Console**
   - Subscription data being written
   - Webhook logs processing correctly
   - Database quota usage

---

## 7. ALERTING & NOTIFICATIONS

### Sentry Alerts
1. Go to Sentry project → Alerts
2. Create alert for:
   - New issues
   - High error frequency (5+ in 1 hour)
   - Performance regression (slow API responses)
3. Set notification channel:
   - Email
   - Slack
   - PagerDuty

### Vercel Alerts
1. Project Settings → Integrations
2. Connect Slack (optional)
3. Get notifications for:
   - Failed deployments
   - High error rates
   - Performance issues

---

## 8. LOGGING & DEBUG INFO

### What Gets Logged

**Webhook Handler** (`src/app/api/webhook/route.ts`)
```
✓ "Successfully processed payment for user {userId}"
✗ "Invalid webhook signature"
✗ "Rate limit exceeded"
✗ "Missing required fields"
```

**Payment Verification** (`src/app/api/payment/verify/route.ts`)
```
✓ "Payment verification successful"
✗ "User not found"
✗ "User already has active subscription"
✗ "Invalid payment amount"
```

**Client-Side** (DaimoPayButton.tsx)
```
✓ Payment initiated
✓ Payment successful
✗ Payment failed with error message
```

### View Logs
- **Development**: Check terminal/console
- **Production**: `vercel logs --prod`
- **Sentry**: All errors automatically captured

---

## 9. PERFORMANCE MONITORING

### Key Metrics to Track

**Page Load Time**
- Target: < 2 seconds
- Monitor in Vercel Analytics

**API Response Time**
- Webhook: < 500ms
- Payment verify: < 1s
- Monitor in Sentry

**Error Rate**
- Target: < 0.1%
- Monitor in Sentry & Vercel

**Database Performance**
- Firestore read/write latency
- Monitor in Firebase console

---

## 10. INCIDENT RESPONSE

### If Payment Failures Increase:
1. Check Sentry for errors
2. Verify webhook signature configuration
3. Check Firebase quota limits
4. Review Daimo Pay API status

### If Page Load Times Slow:
1. Check Vercel Analytics
2. Review Sentry performance traces
3. Look for database latency in Firebase
4. Check for external API delays

### If Errors Spike:
1. Check what changed (recent deployment?)
2. Review Sentry error details
3. Check Firebase logs
4. Monitor webhook processing

---

## 11. SECURITY MONITORING

### Monitor These for Security:
- **Rate limit hits** - Someone trying to flood API
- **Invalid signatures** - Potential webhook spoofing
- **Geographic anomalies** - Payments from unexpected locations
- **Failed verifications** - Invalid payment attempts

### Review Security in:
- Sentry errors dashboard
- Vercel logs
- Firebase audit logs (if enabled)

---

## Configuration Checklist

Before going live:

- [ ] Sentry DSN set in Vercel
- [ ] Sentry Auth Token set in Vercel (for source maps)
- [ ] Sentry project created and configured
- [ ] Email notifications configured in Sentry
- [ ] Vercel Analytics enabled (automatic)
- [ ] Firebase Cloud Logging enabled
- [ ] Webhook logging working (test payment)
- [ ] Error tracking working (trigger test error)
- [ ] Performance monitoring active
- [ ] All dashboards accessible
- [ ] Alert thresholds set appropriately

---

## Quick Reference: Useful Commands

```bash
# View Vercel logs
vercel logs --prod

# Pull environment variables locally
vercel env pull

# Test Sentry locally
npm run dev
# Then trigger an error

# View Firebase logs
# Open https://console.firebase.google.com → Logs

# Monitor webhook in production
vercel logs --prod | grep webhook
```

---

## Support & Next Steps

### If Setup Issues:
1. Check NEXT_PUBLIC_SENTRY_DSN is correct format
2. Verify Sentry project is created and active
3. Ensure environment variables in Vercel not just .env.local
4. Rebuild project: `vercel --prod`

### To Enable Additional Features:
- **Session Replay**: Already enabled in sentry.client.config.ts
- **Source Maps**: Automatic with Sentry auth token
- **Custom Metrics**: Add in application code using `Sentry.captureMessage()`
- **Slack Integration**: Set up in Sentry alerts

---

**Last Updated:** October 31, 2025  
**Version:** 1.0.0