# 🚀 Quick Setup: Test Mini App with ngrok

## The Problem

You're seeing this error:
```
inline keyboard button Web App URL 'http://localhost:3000' is invalid: Only HTTPS links are allowed
```

**Telegram requires HTTPS** for Mini App buttons. `http://localhost:3000` won't work in Telegram (but demo mode still works in browser!).

## ✅ Solution: Use ngrok (Free & Easy)

ngrok creates a secure HTTPS tunnel to your local server.

### Step 1: Install ngrok

**Option A: Using Chocolatey (Recommended)**
```powershell
choco install ngrok
```

**Option B: Manual Download**
1. Go to https://ngrok.com/download
2. Download Windows version
3. Extract to a folder
4. Add to PATH or run from folder

### Step 2: Start ngrok

Open a **NEW terminal window** (keep the bot running in the current one) and run:

```powershell
ngrok http 3000
```

You'll see output like this:
```
ngrok

Session Status                online
Account                       your_account (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

### Step 3: Copy the HTTPS URL

Look for the line that says `Forwarding` and copy the **HTTPS URL**. Example:
```
https://abc123def456.ngrok-free.app
```

⚠️ **Important:** Every time you restart ngrok, you get a NEW URL (unless you have a paid account).

### Step 4: Update .env

Stop your bot (Ctrl+C) and edit your `.env` file:

```env
# Change this line:
WEB_APP_URL=http://localhost:3000

# To your ngrok HTTPS URL:
WEB_APP_URL=https://abc123def456.ngrok-free.app
```

### Step 5: Restart the bot

```powershell
npm start
```

### Step 6: Test in Telegram!

1. Open Telegram
2. Go to @PNPtvbot
3. Send `/start`
4. Click the "🚀 Open Mini App" button
5. **IT SHOULD WORK NOW!** 🎉

## 🎯 What You'll See

When you click "Open Mini App" in Telegram:
- ✅ Mini App opens inside Telegram
- ✅ Shows your actual profile data
- ✅ All features work (profile, map, premium, live)
- ✅ Uses Telegram's theme colors
- ✅ Native Telegram experience

## 📊 Two Terminals Running

You should have:

**Terminal 1:** Bot running
```
npm start
```

**Terminal 2:** ngrok tunnel
```
ngrok http 3000
```

Both must stay running!

## 🔄 If You Restart ngrok

Remember: Free ngrok URLs change each time you restart ngrok!

If you close and reopen ngrok:
1. Get the new HTTPS URL
2. Update `.env` with the new URL
3. Restart the bot (`Ctrl+C` then `npm start`)

## 💰 Alternative: ngrok Paid Account

With a paid ngrok account ($8/month):
- Get a **permanent URL** (e.g., `https://pnptv.ngrok.io`)
- Never change `.env` again
- Custom subdomain

Sign up at https://ngrok.com/pricing

## 🌐 Demo Mode Still Works!

Even without ngrok, you can still test the interface at:
```
http://localhost:3000/demo.html
```

This works in any browser without Telegram!

## 🚀 Production Alternative

For production deployment (not testing), deploy to:
- **Heroku** - Easy deployment
- **Vercel** - Free static hosting
- **DigitalOcean** - Full VPS control
- **AWS** - Scalable hosting

Then set:
```env
WEB_APP_URL=https://your-app.herokuapp.com
```

## 🆘 Troubleshooting

### ngrok not found
Add to PATH or use full path:
```powershell
C:\path\to\ngrok.exe http 3000
```

### Different port
If you changed `WEB_PORT`:
```powershell
ngrok http 3001
```

### Can't access ngrok URL
- Check firewall settings
- Verify bot is running
- Try the ngrok web interface: http://localhost:4040

### Still getting HTTPS error
1. Verify `.env` has the HTTPS URL (not HTTP)
2. Check URL doesn't have trailing slash
3. Restart bot after changing `.env`

## ✅ Quick Checklist

- [ ] ngrok installed
- [ ] ngrok running in separate terminal (`ngrok http 3000`)
- [ ] HTTPS URL copied from ngrok output
- [ ] `.env` updated with HTTPS URL
- [ ] Bot restarted
- [ ] Tested in Telegram

---

**Once setup, the Mini App will work perfectly in Telegram!** 🎉
