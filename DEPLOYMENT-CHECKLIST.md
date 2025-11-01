# 🚀 PNPtv Bot Production Deployment Checklist

## Pre-Deployment

### 1. Environment Configuration
- [ ] Copy `.env.production` and verify all values
- [ ] Replace test keys with production keys
- [ ] Set `NODE_ENV=production`
- [ ] Set `EPAYCO_TEST=false`
- [ ] Set all URLs to `https://pnptv.app`
- [ ] Verify Firebase credentials are production
- [ ] Verify all API keys are correct

### 2. Domain Setup
- [ ] Domain `pnptv.app` is registered
- [ ] DNS A record points to `72.60.29.80`
- [ ] Wait for DNS propagation (check with `nslookup pnptv.app`)

### 3. Server Access
- [ ] Can SSH into `srv1071867.hstgr.cloud`
- [ ] Have root or sudo access
- [ ] Server is Ubuntu/Debian based

### 4. Code Ready
- [ ] All changes committed to Git (optional)
- [ ] No console.log in production code
- [ ] Error handling is in place
- [ ] All features tested locally

## Deployment Steps

### 5. Initial Server Setup (First Time Only)
- [ ] SSH into server: `ssh root@srv1071867.hstgr.cloud`
- [ ] Update system: `sudo apt update && sudo apt upgrade -y`
- [ ] Install Node.js 20: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs`
- [ ] Install PM2: `sudo npm install -g pm2`
- [ ] Install Nginx: `sudo apt install -y nginx`
- [ ] Install Certbot: `sudo apt install -y certbot python3-certbot-nginx`
- [ ] Create app directory: `sudo mkdir -p /var/www/telegram-bot`

### 6. Upload Files
**Option A: Using rsync (Git Bash)**
```bash
./deploy-quick.sh
```

**Option B: Using SFTP (FileZilla/WinSCP)**
- [ ] Upload all files to `/var/www/telegram-bot`
- [ ] Exclude: node_modules, .git, logs, .env
- [ ] Upload `.env.production` as `.env`

**Option C: Using Git**
- [ ] SSH into server
- [ ] `cd /var/www/telegram-bot`
- [ ] `git clone YOUR_REPO .`
- [ ] Copy `.env.production` to `.env`

### 7. Install Dependencies
- [ ] SSH into server
- [ ] `cd /var/www/telegram-bot`
- [ ] `npm install --production`
- [ ] Verify no errors

### 8. Configure Environment
- [ ] Create/edit `.env` file: `nano /var/www/telegram-bot/.env`
- [ ] Paste production environment variables
- [ ] Double-check all URLs use `https://pnptv.app`
- [ ] Save and exit (Ctrl+X, Y, Enter)

### 9. Create Logs Directory
- [ ] `mkdir -p /var/www/telegram-bot/logs`

### 10. Start with PM2
- [ ] `cd /var/www/telegram-bot`
- [ ] `pm2 start ecosystem.config.js --env production`
- [ ] `pm2 save`
- [ ] `pm2 startup systemd` (copy and run the output command)
- [ ] `pm2 status` (verify bot is online)

### 11. Configure Nginx
- [ ] Create config: `sudo nano /etc/nginx/sites-available/pnptv-bot`
- [ ] Paste Nginx configuration (see DEPLOYMENT-HOSTINGER.md)
- [ ] Enable site: `sudo ln -s /etc/nginx/sites-available/pnptv-bot /etc/nginx/sites-enabled/`
- [ ] Test config: `sudo nginx -t`
- [ ] Reload Nginx: `sudo systemctl reload nginx`

### 12. Install SSL Certificate
- [ ] Run: `sudo certbot --nginx -d pnptv.app -d www.pnptv.app`
- [ ] Enter email address
- [ ] Agree to terms
- [ ] Choose to redirect HTTP to HTTPS (option 2)
- [ ] Verify SSL is working: Visit `https://pnptv.app`

### 13. Configure Firewall
- [ ] Enable UFW: `sudo ufw enable`
- [ ] Allow SSH: `sudo ufw allow OpenSSH`
- [ ] Allow HTTP/HTTPS: `sudo ufw allow 'Nginx Full'`
- [ ] Check status: `sudo ufw status`

## Post-Deployment

### 14. Set Telegram Webhook
```bash
curl -F "url=https://pnptv.app/webhook" \
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```
- [ ] Run webhook command
- [ ] Verify webhook:
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```
- [ ] Should show: `"url":"https://pnptv.app/webhook"`

### 15. Configure ePayco Webhooks
- [ ] Go to https://dashboard.epayco.co/
- [ ] Navigate to Settings → Webhooks
- [ ] Set Confirmation URL: `https://pnptv.app/epayco/confirmation`
- [ ] Set Response URL: `https://pnptv.app/epayco/response`
- [ ] Save settings

### 16. Configure Daimo Webhooks
- [ ] Go to https://pay.daimo.com/dashboard
- [ ] Navigate to Settings → Webhooks
- [ ] Set Webhook URL: `https://pnptv-payment-9lx3oqtgp-pnptvbots-projects.vercel.app/api/webhook`
- [ ] Save settings

### 17. Test Bot
- [ ] Open Telegram
- [ ] Send `/start` to @PNPtvBot
- [ ] Verify bot responds
- [ ] Test `/admin` command
- [ ] View subscription plans
- [ ] Test payment flow (ePayco test payment)
- [ ] Test Daimo payment flow
- [ ] Verify webhooks are received

### 18. Monitor Initial Deployment
- [ ] Check PM2 logs: `pm2 logs pnptv-bot`
- [ ] Check application logs: `tail -f /var/www/telegram-bot/logs/pm2-out.log`
- [ ] Check for errors: `tail -f /var/www/telegram-bot/logs/pm2-error.log`
- [ ] Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- [ ] Monitor for 10-15 minutes

## Verification

### 19. Health Checks
- [ ] Bot responds to `/start`
- [ ] Bot responds to `/admin`
- [ ] Subscription plans load
- [ ] Payment buttons work
- [ ] Website accessible at https://pnptv.app
- [ ] SSL certificate is valid (green padlock)
- [ ] No errors in PM2 logs
- [ ] No errors in Nginx logs

### 20. Performance Checks
- [ ] PM2 status shows "online"
- [ ] CPU usage is reasonable (<50%)
- [ ] Memory usage is reasonable (<400MB)
- [ ] Response time is fast (<2 seconds)

## Post-Launch

### 21. Documentation
- [ ] Document any custom configurations
- [ ] Save server credentials securely
- [ ] Document deployment process issues
- [ ] Update team on production URL

### 22. Monitoring Setup
- [ ] Set up uptime monitoring (UptimeRobot, etc.)
- [ ] Configure Sentry for error tracking
- [ ] Set up PM2 monitoring (optional)
- [ ] Schedule regular backups

### 23. Security
- [ ] Change default SSH port (optional)
- [ ] Set up SSH keys
- [ ] Disable password authentication
- [ ] Install fail2ban: `sudo apt install fail2ban`
- [ ] Review firewall rules
- [ ] Set up automatic security updates

### 24. Maintenance Plan
- [ ] Schedule weekly log reviews
- [ ] Schedule monthly server updates
- [ ] Plan backup strategy
- [ ] Document update procedure
- [ ] Set SSL renewal reminder (auto-renews but check)

## Rollback Plan

If something goes wrong:

1. **Stop the bot:**
   ```bash
   pm2 stop pnptv-bot
   ```

2. **Check logs:**
   ```bash
   pm2 logs pnptv-bot --lines 100
   ```

3. **Restore previous version:**
   ```bash
   git reset --hard PREVIOUS_COMMIT
   pm2 restart pnptv-bot
   ```

4. **Contact support if needed**

## Success Criteria

✅ All checklist items completed
✅ Bot responds to commands
✅ Payment flows work
✅ No errors in logs for 1 hour
✅ SSL certificate valid
✅ Webhooks configured and working
✅ Performance metrics acceptable

## 🎉 Deployment Complete!

**Production URLs:**
- Bot: https://t.me/PNPtvBot
- Website: https://pnptv.app
- Webhook: https://pnptv.app/webhook

**Server:**
- Host: srv1071867.hstgr.cloud
- IP: 72.60.29.80
- SSH: `ssh root@srv1071867.hstgr.cloud`

**Quick Commands:**
```bash
# Check status
pm2 status

# View logs
pm2 logs pnptv-bot

# Restart bot
pm2 restart pnptv-bot

# Update bot
./deploy-quick.sh
```

---

**Date Deployed:** _________________

**Deployed By:** _________________

**Notes:** _________________
