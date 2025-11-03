# Daimo Pay - Quick Reference

## ✅ Integration Status: COMPLETE & OPERATIONAL

**Last Updated:** 2025-11-02 09:30 UTC  
**Bot Status:** Running on PM2  
**API Version:** Daimo Pay v1 (Nov 2025)

---

## Quick Links

- **Daimo Dashboard:** https://pay.daimo.com/dashboard
- **API Documentation:** https://paydocs.daimo.com/
- **Webhook Endpoint:** https://pnptv.app/daimo/webhook
- **Config Check:** https://pnptv.app/daimo/config

---

## Key Files

```
src/services/daimoPayService.js         - Core API integration (293 lines)
src/bot/handlers/daimoPayHandler.js     - Telegram UI (365 lines)
src/api/daimo-pay-routes.js             - Webhook handlers (312 lines)
src/bot/helpers/subscriptionHelpers.js  - Payment button integration
```

---

## Environment Variables

```bash
DAIMO_API_KEY=pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw
DAIMO_DESTINATION_ADDRESS=0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0
DAIMO_REFUND_ADDRESS=0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0
DAIMO_WEBHOOK_TOKEN=0x676371f88a7dfe837c563ba8b0fb2f66341cc96a34f9614a1b0a30804c5dd1a729c77020b732fe128f53961fcec9dce2b5f8215eacdf171d7fd3e9c875feaee11b
BOT_URL=https://pnptv.app
```

---

## User Flow

1. User: `/subscribe` → Selects plan
2. Bot: Shows "💰 Pagar con USDC (Daimo)" button
3. User: Clicks button
4. Bot: Creates payment, sends checkout URL
5. User: Opens URL, completes payment via Daimo
6. Webhook: Receives `payment_completed` event
7. Bot: Activates membership, sends confirmation

---

## Supported Chains

- **Base** (8453) - Recommended, lowest fees
- **Optimism** (10)
- **Arbitrum** (42161)
- **Polygon** (137)

---

## Webhook Events

- `payment_started` - Payment initiated
- `payment_completed` - Payment successful → Activate membership
- `payment_bounced` - Payment failed
- `payment_refunded` - Payment refunded

---

## Quick Commands

### Check Configuration
```bash
node -e "const d=require('./src/services/daimoPayService');console.log(JSON.stringify(d.getConfig(),null,2));"
```

### Test Payment Creation
```bash
node -e "require('./src/services/daimoPayService').createPayment({planName:'Test',amount:1,userId:'123',planId:'test',userName:'Test'}).then(r=>console.log(r));"
```

### Monitor Logs
```bash
pm2 logs pnptv-bot | grep daimo
```

### Restart Bot
```bash
pm2 restart pnptv-bot
```

### Check Bot Status
```bash
pm2 status pnptv-bot
```

---

## Troubleshooting

**Webhook not working?**
→ Check Daimo dashboard webhook URL: `https://pnptv.app/daimo/webhook`

**Payment fails?**
→ Verify DAIMO_API_KEY and wallet addresses

**Membership not activating?**
→ Check `pm2 logs pnptv-bot` for webhook processing errors

---

## Configuration Check

Run this to verify everything is configured:

```bash
cd "/root/bot 1" && node -e "
const config = require('./src/services/daimoPayService').getConfig();
console.log('Daimo Pay Configuration:');
console.log('========================');
console.log('Enabled:', config.enabled ? '✅ YES' : '❌ NO');
console.log('API Key:', config.apiKey);
console.log('Destination:', config.destinationAddress);
console.log('Refund Address:', config.refundAddress);
console.log('Webhook URL:', config.webhookUrl);
console.log('========================');
console.log(config.enabled ? '✅ ALL CONFIGURED' : '❌ MISSING CONFIG');
"
```

Expected output:
```
Daimo Pay Configuration:
========================
Enabled: ✅ YES
API Key: ***KuUw
Destination: 0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0
Refund Address: 0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0
Webhook URL: https://pnptv.app/daimo/webhook
========================
✅ ALL CONFIGURED
```

---

## Next Steps

1. ✅ Integration complete
2. ✅ Bot deployed and running
3. ⏳ Configure webhook in Daimo dashboard
4. ⏳ Test payment flow with small amount
5. ⏳ Monitor first transactions

---

## Support

- Check logs: `pm2 logs pnptv-bot`
- Review: `DAIMO_PAY_INTEGRATION_COMPLETE.md`
- API Docs: https://paydocs.daimo.com/
