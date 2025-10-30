# 🚀 Deploy Payment Fix to Hostinger - Quick Guide

## Current Issue
Payment page at **https://pnptv.app/pay** is showing errors.

## Solution
Deploy the updated files to your production server.

---

## ⚡ Quick Deploy (3 Steps)

### Step 1: Upload Package
Upload `pnptv-payment-fix-PRODUCTION.tar.gz` to your server at `/root/`

**Methods:**
- Hostinger File Manager (easiest)
- SCP: `scp pnptv-payment-fix-PRODUCTION.tar.gz root@72.60.29.80:/root/`

### Step 2: Extract & Deploy
Connect to server and run:

```bash
# Find your bot directory
pm2 info pnptv-bot | grep "exec cwd"

# Extract files (replace BOT_DIR with your path)
cd /root
tar -xzf pnptv-payment-fix-PRODUCTION.tar.gz -C /var/www/pnptv-bot/

# Restart bot
pm2 restart pnptv-bot
```

### Step 3: Verify
Test: https://pnptv.app/pay?plan=pnp-member&user=123&amount=24.99

Should show:
- ✅ "PNP Member" (not error)
- ✅ "30 days" duration
- ✅ "$24.99 USDC"

---

## 📋 Full Instructions

See [PAYMENT_FIX_COMPLETE.md](PAYMENT_FIX_COMPLETE.md) for detailed documentation.

---

## Package Location

```
/root/Bots/pnptv-payment-fix-PRODUCTION.tar.gz (17KB)
```

Contains:
- Fixed payment page
- Updated API routes
- Updated webhook
- Diagnostic tools
