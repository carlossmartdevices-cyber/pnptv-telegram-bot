# Quick Deployment Guide - Daimo Payment Fix

## What Was Fixed

1. ✅ **Hardcoded 30-day duration** → Now shows actual plan duration
2. ✅ **Plan ID instead of name** → Now shows display name (e.g., "Trial Pass")
3. ✅ **Button not loading** → Improved error handling and logging
4. ✅ **Missing plan data** → Added API call to fetch full plan details

## Files Changed

- `public/payment-daimo.html` - New payment page with dynamic data
- `src/bot/api/routes.js` - Enhanced plan API endpoint
- `src/bot/webhook.js` - Updated to serve new page
- `DAIMO_PAYMENT_FIXED.md` - Detailed documentation

## Deployment Options

### Option 1: Quick Fix (Manual Upload)

If you just want to fix the payment page quickly:

```bash
# On your local machine (if you have SSH access)
scp public/payment-daimo.html root@72.60.29.80:/var/www/telegram-bot/public/
scp src/bot/webhook.js root@72.60.29.80:/var/www/telegram-bot/src/bot/
scp src/bot/api/routes.js root@72.60.29.80:/var/www/telegram-bot/src/bot/api/

# Then SSH and restart
ssh root@72.60.29.80
cd /var/www/telegram-bot
pm2 restart pnptv-bot
```

### Option 2: Deploy Package (Recommended)

Use the prepared deployment package:

```bash
# Upload the fix package
scp daimo-payment-fix.tar.gz root@72.60.29.80:/var/www/telegram-bot/

# SSH into server
ssh root@72.60.29.80

# Extract and restart
cd /var/www/telegram-bot
tar -xzf daimo-payment-fix.tar.gz
pm2 restart pnptv-bot
pm2 logs pnptv-bot
```

### Option 3: Full Redeployment

If you want to redeploy everything:

```bash
# From your Bots directory
cd /root/Bots

# Create full package
tar -czf pnptv-bot-full.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='logs' \
  src/ public/ package.json ecosystem.config.js

# Upload
scp pnptv-bot-full.tar.gz root@72.60.29.80:/var/www/telegram-bot/

# On server
ssh root@72.60.29.80
cd /var/www/telegram-bot
tar -xzf pnptv-bot-full.tar.gz
npm install --production
pm2 restart pnptv-bot
```

## Testing After Deployment

### 1. Check Payment Page Loads

```bash
curl -I https://pnptv.app/pay?plan=trial-pass&user=123&amount=5
# Should return: 200 OK
```

### 2. Check Plan API Works

```bash
curl https://pnptv.app/api/plans/trial-pass
```

Expected response:
```json
{
  "id": "trial-pass",
  "name": "Trial Pass",
  "displayName": "Trial Pass",
  "price": 5,
  "duration": 7,
  "durationDays": 7,
  "features": ["..."],
  "icon": "🎟️",
  "description": "7-day trial access"
}
```

### 3. Test in Telegram Bot

1. Open your bot: https://t.me/PNPtvBot
2. Send: `/subscribe`
3. Select any plan
4. Click "Pay with USDC (Daimo)"
5. Verify:
   - ✅ Plan name shows correctly (not "TRIAL_PASS")
   - ✅ Duration shows correct days (not always "30 days")
   - ✅ Amount displays properly
   - ✅ Payment button appears (not stuck on "Loading...")

### 4. Check Logs

```bash
pm2 logs pnptv-bot | grep -E "(Payment page|Plan details|Daimo)"
```

Look for:
```
Payment page loaded { planId: 'trial-pass', userId: '123', amount: 5 }
Plan details loaded { name: 'Trial Pass', duration: 7 }
Daimo Pay button mounted successfully
```

## Troubleshooting

### Payment Page Shows "Loading..." Forever

**Check browser console (F12):**
- Look for JavaScript errors
- Check if SDK imports are successful
- Verify API calls are working

**Fix:**
```bash
# Check if API endpoint is accessible
curl https://pnptv.app/api/plans/trial-pass

# Check bot logs
pm2 logs pnptv-bot | tail -50
```

### Button Still Not Appearing

**Possible causes:**
1. SDK import failure from esm.sh
2. Network connectivity issues
3. Browser blocking third-party scripts

**Debug:**
Open payment page and check browser console for errors:
```
https://pnptv.app/pay?plan=trial-pass&user=123&amount=5
```

### Plan Data Not Loading

**Check:**
```bash
# Verify plan exists in database
curl https://pnptv.app/api/plans/trial-pass

# Check API logs
pm2 logs pnptv-bot | grep "API:"
```

## Rollback (If Needed)

If something breaks, you can restore the old version:

```bash
cd /var/www/telegram-bot
cp public/payment-daimo-old.html public/payment-daimo.html
pm2 restart pnptv-bot
```

## Next Steps After Deployment

1. **Test each plan type:**
   - Trial Pass (7 days)
   - Monthly (30 days)
   - Quarterly (90 days)
   - Annual (365 days)

2. **Monitor payments:**
   ```bash
   pm2 logs pnptv-bot | grep -i daimo
   ```

3. **Check webhook endpoint:**
   - Ensure Daimo webhook is configured: `https://pnptv.app/daimo/webhook`
   - Test webhook receives notifications

4. **Verify subscription activation:**
   - Make test payment
   - Check user gets access
   - Verify expiration date is set correctly

## Files in Deployment Package

- `daimo-payment-fix.tar.gz` (14KB):
  - src/bot/webhook.js
  - src/bot/api/routes.js
  - public/payment-daimo.html
  - DAIMO_PAYMENT_FIXED.md

## Support

If you encounter issues:

1. Check logs: `pm2 logs pnptv-bot`
2. Check browser console for payment page
3. Verify API endpoints are accessible
4. Read detailed docs: `DAIMO_PAYMENT_FIXED.md`

---

**Ready to deploy?** Choose an option above and follow the steps!
