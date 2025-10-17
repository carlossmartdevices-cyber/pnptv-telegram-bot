# Railway Deployment Guide

## Environment Variables Configuration

Copy and paste these environment variables into your Railway project settings.

### Required Variables

```env
# Bot Configuration
TELEGRAM_TOKEN=your_telegram_bot_token_here
ADMIN_IDS=your_telegram_user_id_here

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}

# ePayco Payment Gateway (Production Credentials)
EPAYCO_PUBLIC_KEY=881ddf8418549218fe2f227458f2f59c
EPAYCO_PRIVATE_KEY=80174d93a6f8d760f5cca2b2cc6ee48b
EPAYCO_P_CUST_ID=1555482
EPAYCO_P_KEY=e76ae8e9551df6e3b353434c4de34ef2dafa41bf
EPAYCO_TEST_MODE=true
EPAYCO_RESPONSE_URL=https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/epayco/response
EPAYCO_CONFIRMATION_URL=https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/epayco/confirmation

# Bot URLs
BOT_URL=https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com
WEB_APP_URL=https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com

# Web Server
PORT=3000
WEB_PORT=3000
```

## Step-by-Step Deployment

### 1. Update Environment Variables in Railway

1. Go to your Railway project: https://railway.app/project/your-project-id
2. Click on your service (pnptv-telegram-bot-production)
3. Go to **Variables** tab
4. Add/Update each variable listed above

**Important:** For `FIREBASE_CREDENTIALS`, make sure to paste the entire JSON object as a single line without line breaks.

### 2. Verify ePayco Credentials

The following credentials are now configured:

- **Public Key**: `881ddf8418549218fe2f227458f2f59c`
- **Private Key**: `80174d93a6f8d760f5cca2b2cc6ee48b`
- **P_CUST_ID**: `1555482`
- **P_KEY**: `e76ae8e9551df6e3b353434c4de34ef2dafa41bf`

These are **production credentials** from your ePayco dashboard.

### 3. Test Mode Configuration

Currently set to: `EPAYCO_TEST_MODE=true`

**In Test Mode (Sandbox):**
- Payments use: `https://checkout.epayco.co/sandbox`
- No real charges are made
- Use test cards from ePayco documentation
- Perfect for testing the integration

**For Production:**
- Set `EPAYCO_TEST_MODE=false`
- Real payments will be processed
- Only switch after thorough testing

### 4. Webhook URLs

Your webhook endpoints are configured as:

- **Response URL**: `https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/epayco/response`
  - Called when user completes/cancels payment
  - User is redirected here

- **Confirmation URL**: `https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/epayco/confirmation`
  - Called by ePayco server-to-server
  - Must be publicly accessible
  - Must respond with status 200

**Note:** These endpoints need to be implemented in `src/web/server.js`

## Testing Checklist

### Before Deploying

- [ ] All environment variables are set in Railway
- [ ] FIREBASE_CREDENTIALS is valid JSON (use a JSON validator)
- [ ] TELEGRAM_TOKEN is correct
- [ ] ADMIN_IDS contains your Telegram user ID
- [ ] EPAYCO_TEST_MODE is set to `true` for testing

### After Deploying

- [ ] Bot starts successfully (check Railway logs)
- [ ] Firebase connection works
- [ ] Bot responds to `/start` command
- [ ] Admin panel is accessible
- [ ] Subscription buttons appear
- [ ] Payment links are generated
- [ ] Payment links open ePayco checkout

### Testing Payment Flow

1. **Click Subscribe Button**
   - Should see plan details and payment button
   - Log should show: `Creating ePayco payment link for user...`

2. **Click Payment Button**
   - Should open ePayco checkout page
   - URL should start with: `https://securepayco.epayco.co/payment/...`
   - **NOT** `https://checkout.epayco.co/sandbox?public_key=...`

3. **Complete Test Payment**
   - Use ePayco test card: `4575623182290326`
   - CVV: `123`
   - Expiry: Any future date

4. **Verify Confirmation**
   - Check Railway logs for webhook calls
   - Membership should be activated
   - User receives confirmation message

## Troubleshooting

### Payment Links Not Working

**Check Railway logs for:**
```
Creating ePayco payment link for user X, plan: silver
ePayco payment link created successfully: https://securepayco...
```

**If you see errors:**
- Verify all EPAYCO_* variables are set correctly
- Check that PUBLIC_KEY and PRIVATE_KEY match your ePayco dashboard
- Ensure no extra spaces or quotes in the values

### Webhook Not Receiving Confirmations

**Possible issues:**
1. Webhook URL is not publicly accessible
2. SSL/HTTPS is not configured (required by ePayco)
3. Webhook endpoint is not implemented
4. Firewall blocking ePayco servers

**To fix:**
- Railway URLs are HTTPS by default ✅
- Ensure `/epayco/response` and `/epayco/confirmation` routes exist in `src/web/server.js`

### Firebase Credentials Error

**Error:** "Expected property name or '}' in JSON"

**Solution:**
1. Copy your Firebase credentials JSON from Firebase Console
2. Remove ALL line breaks (must be single line)
3. Validate JSON at: https://jsonlint.com/
4. Paste the single-line JSON into Railway

**Correct format:**
```json
{"type":"service_account","project_id":"your-project","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"..."}
```

## Monitoring

### Important Logs to Watch

**Successful payment flow:**
```
Creating ePayco payment link for user 123456, plan: silver
ePayco SDK response: { success: true, hasData: true, hasUrl: true }
ePayco payment link created successfully: https://securepayco...
User 123456 clicked payment button: https://securepayco...
```

**Failed payment:**
```
ePayco payment creation failed: [error message]
Error creating ePayco payment link: [details]
```

### Metrics to Track

- Payment links created per day
- Successful payments
- Failed payments
- Webhook confirmations received
- Membership activations

## Production Deployment

When ready to accept real payments:

1. **Test thoroughly in sandbox mode**
   - Complete at least 5 test payments
   - Verify memberships activate correctly
   - Test webhook confirmations

2. **Switch to production mode**
   ```env
   EPAYCO_TEST_MODE=false
   ```

3. **Test with small amount first**
   - Make one real payment with minimum amount
   - Verify everything works end-to-end

4. **Monitor closely**
   - Watch Railway logs
   - Check ePayco dashboard for transactions
   - Verify users receive confirmations

5. **Set up alerts**
   - Monitor for payment errors
   - Alert on webhook failures
   - Track failed membership activations

## Security Checklist

- [ ] Never commit `.env` file to git
- [ ] Keep `.env.example` without real credentials (use placeholders)
- [ ] Verify webhook signatures from ePayco
- [ ] Use HTTPS for all webhook URLs
- [ ] Validate transaction status before activating membership
- [ ] Log all payment attempts for audit trail
- [ ] Monitor for suspicious activity

## Support Resources

- **ePayco Dashboard**: https://dashboard.epayco.co/
- **ePayco API Docs**: https://docs.epayco.co/
- **ePayco Support**: soporte@epayco.co
- **Railway Dashboard**: https://railway.app/
- **Firebase Console**: https://console.firebase.google.com/

## Next Steps

1. **Deploy to Railway** with updated environment variables
2. **Test payment flow** end-to-end in sandbox mode
3. **Implement webhook handlers** in `src/web/server.js`
4. **Test webhook confirmations** with test payments
5. **Monitor logs** for any errors
6. **Switch to production mode** when ready

## Quick Deploy Command

If deploying from local machine:

```bash
# Commit latest changes
git add .
git commit -m "Configure ePayco production credentials"
git push origin main
```

Railway will automatically detect the push and deploy.

## Emergency Rollback

If something goes wrong after deployment:

1. Go to Railway dashboard
2. Click on your service
3. Go to **Deployments** tab
4. Find the previous working deployment
5. Click **Redeploy** to rollback

## Contact

If you encounter issues during deployment:
- Check Railway logs first
- Review this guide's troubleshooting section
- Verify all environment variables are correct
- Test locally if possible
