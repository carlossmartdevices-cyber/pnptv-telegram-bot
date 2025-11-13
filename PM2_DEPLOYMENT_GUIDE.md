# PM2 Deployment Guide - PNPtv Bot

## ✅ **Deployment Complete!**

The PNPtv bot has been successfully deployed using PM2 ecosystem configuration.

### **Current Status**
- **Bot Name**: `pnptv-bot`
- **Process ID**: 3
- **Status**: Online ✅
- **Memory Usage**: ~160MB
- **Script**: `./start-bot.js`
- **Mode**: Fork (single instance)
- **Auto-restart**: Enabled
- **Startup on boot**: Configured ✅

---

## **PM2 Management Commands**

### **Basic Operations**
```bash
# View all processes
pm2 list

# View specific process
pm2 show pnptv-bot

# Restart bot
pm2 restart pnptv-bot

# Stop bot
pm2 stop pnptv-bot

# Start bot (if stopped)
pm2 start pnptv-bot

# Delete bot process
pm2 delete pnptv-bot
```

### **Logs & Monitoring**
```bash
# View real-time logs
pm2 logs pnptv-bot

# View last 50 lines
pm2 logs pnptv-bot --lines 50

# View only error logs
pm2 logs pnptv-bot --err

# View only standard output
pm2 logs pnptv-bot --out

# Clear logs
pm2 flush pnptv-bot
```

### **Configuration Management**
```bash
# Start with ecosystem file
pm2 start ecosystem.config.js

# Restart with ecosystem file
pm2 restart ecosystem.config.js

# Reload with zero downtime
pm2 reload ecosystem.config.js

# Start in production mode
pm2 start ecosystem.config.js --env production
```

### **Process Management**
```bash
# Save current process list
pm2 save

# Restore saved processes
pm2 resurrect

# Monitor processes
pm2 monit

# Reset restart counter
pm2 reset pnptv-bot
```

---

## **Ecosystem Configuration**

The bot is configured with the following settings:

- **Entry Point**: `./start-bot.js`
- **Instances**: 1 (single process)
- **Max Memory**: 500MB restart threshold
- **Node Arguments**: `--max-old-space-size=512`
- **Environment**: Production
- **Auto-restart**: Yes (max 10 restarts)
- **Logs**: Stored in `./logs/pm2-*.log`

---

## **System Integration**

### **Startup Configuration**
The bot is configured to automatically start on system reboot:
- **Service**: `pm2-root.service`
- **Status**: Enabled
- **User**: root

### **Verify Startup Service**
```bash
# Check service status
systemctl status pm2-root

# Enable/disable auto-start
sudo systemctl enable pm2-root
sudo systemctl disable pm2-root
```

---

## **Log Files Location**

- **PM2 Logs**: `/root/bot 1/logs/pm2-*.log`
- **Application Logs**: `/root/bot 1/logs/app.log`
- **Error Logs**: `/root/bot 1/logs/error.log`

---

## **Deployment Workflow**

### **Code Updates**
```bash
# 1. Navigate to project directory
cd /root/bot\ 1

# 2. Pull latest changes (if using Git)
git pull origin main

# 3. Install dependencies (if needed)
npm install --production

# 4. Restart with PM2
pm2 restart ecosystem.config.js
```

### **Environment Updates**
```bash
# 1. Edit .env file
nano .env

# 2. Restart bot to apply changes
pm2 restart pnptv-bot
```

---

## **Health Monitoring**

### **Bot Status Checks**
- **Process Status**: `pm2 list`
- **Memory Usage**: `pm2 monit`
- **Recent Logs**: `pm2 logs pnptv-bot --lines 20`
- **Error Count**: Check restart counter in `pm2 list`

### **Key Metrics to Monitor**
- Memory usage (should stay under 500MB)
- CPU usage (should be low when idle)
- Restart count (frequent restarts indicate issues)
- Log errors (especially Firebase/Telegram API errors)

---

## **Troubleshooting**

### **Bot Not Starting**
```bash
# Check logs
pm2 logs pnptv-bot --err

# Verify environment variables
pm2 show pnptv-bot

# Restart from ecosystem file
pm2 delete pnptv-bot && pm2 start ecosystem.config.js
```

### **High Memory Usage**
```bash
# Check memory details
pm2 show pnptv-bot

# Restart to clear memory
pm2 restart pnptv-bot

# Monitor real-time
pm2 monit
```

### **Permission Issues**
```bash
# Check file permissions
ls -la /root/bot\ 1/

# Fix if needed
chmod +x start-bot.js
chown -R root:root /root/bot\ 1/
```

---

## **Current Issues (Non-Critical)**

1. **Firestore Index Missing**: Event reminder queries need database index
   - Error: `FAILED_PRECONDITION: The query requires an index`
   - Solution: Create index in Firebase Console (link provided in logs)

2. **Broadcast Failures**: Some users have blocked/deactivated accounts
   - This is normal operation - failed sends are logged as warnings

3. **Group Permission Errors**: Bot needs admin rights in Telegram groups
   - Solution: Make bot admin in groups where permission management is needed

---

## **Performance Notes**

- **Memory**: Currently using ~160MB (normal)
- **CPU**: Low usage when idle (normal)
- **Restarts**: 0 (excellent stability)
- **Uptime**: Running continuously since deployment

The bot is now **production-ready** and will automatically restart on server reboot! 🚀