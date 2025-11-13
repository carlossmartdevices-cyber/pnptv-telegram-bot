# WebApp Quick Reference

## Deploy WebApp (One Command)
```bash
sudo /root/bot\ 1/deploy-webapp.sh
```

## Manual Deploy
```bash
cd /root/bot\ 1
pm2 start ecosystem.webapp.config.js
sudo cp nginx-webapp.conf /etc/nginx/sites-available/pnptv-bot
sudo nginx -t && sudo systemctl reload nginx
pm2 save
```

## Check Status
```bash
pm2 list | grep webapp
curl -I https://pnptv.app/app
```

## View Logs
```bash
pm2 logs pnptv-webapp
pm2 logs pnptv-webapp --lines 100
```

## Restart
```bash
pm2 restart pnptv-webapp
```

## Update WebApp
```bash
cd /root/bot\ 1/src/webapp
git pull
npm run build
pm2 restart pnptv-webapp
```

## Rollback
```bash
pm2 delete pnptv-webapp
sudo cp /etc/nginx/sites-available/pnptv-bot.backup /etc/nginx/sites-available/pnptv-bot
sudo systemctl reload nginx
```

## Troubleshooting
```bash
# Service down?
pm2 restart pnptv-webapp

# Port conflict?
sudo lsof -i :3001

# Nginx errors?
sudo nginx -t
sudo tail -f /var/log/nginx/error.log

# Rebuild from scratch
cd /root/bot\ 1/src/webapp
rm -rf .next node_modules
npm install && npm run build
pm2 restart pnptv-webapp
```

## Architecture
- **Main Bot**: localhost:3000 (Express + Telegraf)
- **WebApp**: localhost:3001 (Next.js standalone)
- **Nginx**: Routes /app → 3001, /* → 3000

## Files
- `ecosystem.webapp.config.js` - PM2 config
- `nginx-webapp.conf` - Nginx config
- `deploy-webapp.sh` - Deploy script
- `WEBAPP_DEPLOYMENT_GUIDE.md` - Full guide
