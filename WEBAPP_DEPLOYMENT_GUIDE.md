# WebApp Deployment Guide - Recommended Solution

## Why This Approach?

**Recommended: Run Next.js as separate PM2 service** ✅

### Advantages
- ✅ **Zero code changes** - Uses existing Next.js build
- ✅ **PM2 managed** - Auto-restart, monitoring, logs
- ✅ **Independent updates** - Update webapp without touching main bot
- ✅ **Better resource control** - Separate memory limits and CPU allocation
- ✅ **Hot reload capable** - Can rebuild without main bot downtime
- ✅ **Professional setup** - Industry standard for microservices

### vs. Static Export
Static export would require:
- ❌ Rebuild with `output: 'export'` (loses API routes)
- ❌ No server-side features (SSR, API routes, dynamic rendering)
- ❌ More complex deployment process
- ❌ Limited Next.js features

## Architecture

```
User Request → Nginx (443) → Route by path:
                              ├─ /app, /_next  → localhost:3001 (Next.js)
                              └─ /*            → localhost:3000 (Express Bot)
```

## Quick Deploy

### One-Command Deployment
```bash
sudo /root/bot\ 1/deploy-webapp.sh
```

This script automatically:
1. Checks/builds webapp if needed
2. Starts webapp with PM2
3. Updates Nginx config
4. Reloads Nginx
5. Saves PM2 configuration

### Manual Deployment

If you prefer step-by-step:

#### Step 1: Ensure webapp is built
```bash
cd /root/bot\ 1/src/webapp
npm install  # If needed
npm run build
```

#### Step 2: Start webapp with PM2
```bash
cd /root/bot\ 1
pm2 start ecosystem.webapp.config.js
```

#### Step 3: Update Nginx
```bash
sudo cp /etc/nginx/sites-available/pnptv-bot /etc/nginx/sites-available/pnptv-bot.backup
sudo cp nginx-webapp.conf /etc/nginx/sites-available/pnptv-bot
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

#### Step 4: Save PM2 config
```bash
pm2 save
```

## Verification

### Check Services
```bash
pm2 list
# Should show both:
# ├─ pnptv-bot (port 3000)
# └─ pnptv-webapp (port 3001)
```

### Test Endpoints
```bash
# Main bot
curl -I https://pnptv.app/

# WebApp
curl -I https://pnptv.app/app

# Next.js assets
curl -I https://pnptv.app/_next/static/chunks/main.js
```

### View Logs
```bash
# WebApp logs
pm2 logs pnptv-webapp

# Bot logs
pm2 logs pnptv-bot

# Both
pm2 logs
```

## Management Commands

### Restart WebApp Only
```bash
pm2 restart pnptv-webapp
```

### Restart Both Services
```bash
pm2 restart all
```

### Update WebApp
```bash
cd /root/bot\ 1/src/webapp
git pull  # or make changes
npm run build
pm2 restart pnptv-webapp
```

### Monitor Resources
```bash
pm2 monit
```

### Stop WebApp (Temporarily)
```bash
pm2 stop pnptv-webapp
# Revert Nginx or bot will show fallback
```

## Environment Variables

The webapp uses these from `.env.production`:

```bash
NEXT_PUBLIC_BOT_URL=https://pnptv.app
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=PNPtvBot
NEXT_PUBLIC_WEBAPP_URL=https://pnptv.app/app
NEXT_PUBLIC_API_URL=https://pnptv.app
```

Update in `ecosystem.webapp.config.js` if needed.

## Troubleshooting

### WebApp shows 502
```bash
# Check if service is running
pm2 status pnptv-webapp

# Check logs for errors
pm2 logs pnptv-webapp --lines 50

# Restart
pm2 restart pnptv-webapp
```

### Port 3001 already in use
```bash
# Find what's using it
sudo lsof -i :3001

# Kill if needed
sudo kill -9 <PID>

# Restart
pm2 restart pnptv-webapp
```

### Nginx errors
```bash
# Test config
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restore backup if needed
sudo cp /etc/nginx/sites-available/pnptv-bot.backup /etc/nginx/sites-available/pnptv-bot
sudo systemctl reload nginx
```

### WebApp won't build
```bash
cd /root/bot\ 1/src/webapp

# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

## Performance Tuning

### Increase memory limit
Edit `ecosystem.webapp.config.js`:
```javascript
max_memory_restart: '500M',  // Default is 300M
```

### Add more instances (cluster mode)
```javascript
instances: 2,  // Default is 1
exec_mode: 'cluster',
```

## Rollback Plan

If anything goes wrong:

### Restore Nginx
```bash
sudo cp /etc/nginx/sites-available/pnptv-bot.backup /etc/nginx/sites-available/pnptv-bot
sudo systemctl reload nginx
```

### Stop WebApp
```bash
pm2 delete pnptv-webapp
```

The bot will continue serving the fallback HTML page.

## Files Created

- `ecosystem.webapp.config.js` - PM2 configuration for webapp
- `nginx-webapp.conf` - Updated Nginx config with /app routing
- `deploy-webapp.sh` - Automated deployment script
- `WEBAPP_DEPLOYMENT_GUIDE.md` - This file

## Next Steps After Deployment

1. **Test in Telegram**: Open bot → Use webapp button
2. **Monitor performance**: `pm2 monit`
3. **Check logs**: `pm2 logs pnptv-webapp`
4. **Update bot handlers**: Remove fallback HTML from webhook.js (optional)

## Support

If issues persist:
- Check PM2 logs: `pm2 logs pnptv-webapp --lines 100`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Verify ports: `sudo netstat -tlnp | grep -E '3000|3001'`
- Test locally: `cd src/webapp && npm run dev`

---
**Status**: Ready to deploy
**Estimated time**: 2-3 minutes
**Downtime**: None (services start independently)
