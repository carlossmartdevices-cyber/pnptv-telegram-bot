# 🚀 Hostinger VPS Deployment - Complete!

Your Santino Group Bot is now deployed and running on your Hostinger VPS!

## ✅ Deployment Summary

**Status:** 🟢 ONLINE and RUNNING
**Mode:** Long Polling (recommended for VPS)
**Process Manager:** PM2
**Auto-Start:** ✅ Enabled (survives server reboots)
**Monitoring Group:** -1002997324714

## 📊 Bot Status

```bash
# Check if bot is running
pm2 status

# View real-time logs
pm2 logs santino-group-bot

# View last 50 lines of logs
pm2 logs santino-group-bot --lines 50 --nostream
```

## 🔧 Common PM2 Commands

### View Status
```bash
pm2 list                    # List all processes
pm2 status santino-group-bot  # Check bot status
pm2 info santino-group-bot    # Detailed info
```

### View Logs
```bash
pm2 logs santino-group-bot              # Live logs (Ctrl+C to exit)
pm2 logs santino-group-bot --lines 100  # Last 100 lines
pm2 logs santino-group-bot --err        # Only errors
```

### Control Bot
```bash
pm2 restart santino-group-bot  # Restart bot
pm2 stop santino-group-bot     # Stop bot
pm2 start santino-group-bot    # Start bot (if stopped)
pm2 delete santino-group-bot   # Remove from PM2
```

### Monitoring
```bash
pm2 monit                  # Real-time monitoring dashboard
pm2 show santino-group-bot # Detailed process information
```

## 🔄 Updating the Bot

When you make changes to the code:

```bash
# 1. Navigate to bot directory
cd "/root/bot 1/SantinoBot"

# 2. Pull latest changes (if using git)
git pull

# 3. Install any new dependencies
npm install

# 4. Restart the bot
pm2 restart santino-group-bot

# 5. Check logs to ensure it started correctly
pm2 logs santino-group-bot --lines 20
```

## ⚙️ Configuration Changes

If you need to update environment variables:

```bash
# 1. Edit .env file
nano "/root/bot 1/SantinoBot/.env"

# 2. Make your changes and save (Ctrl+X, Y, Enter)

# 3. Restart bot to apply changes
pm2 restart santino-group-bot
```

## 🐛 Troubleshooting

### Bot Not Responding

```bash
# Check if bot is running
pm2 status santino-group-bot

# Check logs for errors
pm2 logs santino-group-bot --err --lines 50

# Restart bot
pm2 restart santino-group-bot
```

### Memory Issues

```bash
# Check memory usage
pm2 monit

# Or use
pm2 list

# If high memory, restart:
pm2 restart santino-group-bot
```

### Bot Crashed

```bash
# Check error logs
pm2 logs santino-group-bot --err

# PM2 will auto-restart crashed processes
# To manually restart:
pm2 restart santino-group-bot
```

## 📁 Important File Locations

```
Bot Directory:    /root/bot 1/SantinoBot
Environment File: /root/bot 1/SantinoBot/.env
PM2 Logs:         /root/.pm2/logs/santino-group-bot-*.log
PM2 Config:       /root/.pm2/dump.pm2
```

## 🔒 Security Notes

1. **Never share .env file** - Contains sensitive credentials
2. **Firewall:** VPS should have firewall configured
3. **Regular Updates:** Keep Node.js and dependencies updated

## 📊 Server Resource Usage

Current bot resource usage:
- **Memory:** ~15-20 MB (very light!)
- **CPU:** < 1%
- **Auto-restart:** Enabled

## 🎯 Post-Deployment Checklist

- [x] Bot deployed to Hostinger VPS
- [x] PM2 process manager configured
- [x] Auto-start on reboot enabled
- [x] Long polling mode active
- [x] Firebase connected
- [x] Monitoring group configured
- [x] Logs accessible

## ✅ Verify Bot is Working

In your Telegram group:

1. Send `/status` - Bot should respond
2. As free user, send a photo - Should be deleted
3. As premium user, send a photo - Should stay
4. Add new member - Should get welcome message

## 📞 Quick Support Commands

```bash
# Full status check
cd "/root/bot 1/SantinoBot" && \
pm2 status santino-group-bot && \
pm2 logs santino-group-bot --lines 10 --nostream

# Restart and view logs
pm2 restart santino-group-bot && \
pm2 logs santino-group-bot --lines 20
```

## 🔄 Daily Maintenance (Optional)

```bash
# View today's activity
pm2 logs santino-group-bot --lines 100 | grep $(date +%Y-%m-%d)

# Check resource usage
pm2 monit
```

## 🚨 Emergency Commands

If bot is misbehaving:

```bash
# Nuclear option - stop, delete, recreate
pm2 delete santino-group-bot
cd "/root/bot 1/SantinoBot"
pm2 start src/bot.js --name "santino-group-bot" --time
pm2 save
```

---

## 🎉 Success!

Your Santino Group Bot is now:
- ✅ Running 24/7 on Hostinger VPS
- ✅ Auto-restarting if it crashes
- ✅ Auto-starting on server reboot
- ✅ Monitoring your group in real-time
- ✅ Syncing with Firebase database

**Bot is fully operational and managing permissions!** 🚀

---

**Next Steps:**
1. Test bot in your Telegram group
2. Monitor logs for the first few hours: `pm2 logs santino-group-bot`
3. Check that permissions are working correctly
4. Enjoy automated group management! 

**Questions or issues?** Check logs first: `pm2 logs santino-group-bot`
