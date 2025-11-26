# PNPtv Telegram Mini App Setup Guide

## Overview

The PNPtv Mini App is a web-based interface that runs inside Telegram, providing an enhanced user experience with:

- **User Profile Management** - View and edit profile with photos
- **Interactive Map** - See nearby users with real-time distance calculation
- **Live Streams** - Browse and watch live content (coming soon)
- **Premium Plans** - Upgrade to Silver or Golden tiers

## Architecture

```
┌─────────────────┐
│  Telegram Bot   │
│   (telegraf)    │
└────────┬────────┘
         │
         ├─── Commands (/start, /profile, /map)
         │
         └─── Mini App Button
                  │
                  ▼
         ┌────────────────┐
         │   Web Server   │
         │   (Express)    │
         └────────┬───────┘
                  │
                  ├─── /api/profile
                  ├─── /api/map/nearby
                  ├─── /api/live/streams
                  ├─── /api/plans
                  │
                  └─── Static Files (HTML/CSS/JS)
                           │
                           ▼
                  ┌────────────────┐
                  │   Firebase DB  │
                  └────────────────┘
```

## Files Structure

```
src/
├── web/
│   ├── server.js           # Express web server + API endpoints
│   └── public/
│       ├── index.html      # Mini App main page
│       ├── styles.css      # Telegram-themed styles
│       └── app.js          # Client-side JavaScript
├── bot/
│   ├── index.js            # Bot with Mini App integration
│   └── handlers/
│       └── start.js        # Includes Mini App button
└── config/
    └── plans.js            # Premium plans configuration
```

## Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Web server port for Mini App
WEB_PORT=3000

# Web App URL (for Mini App button)
# For development with ngrok:
WEB_APP_URL=https://abc123.ngrok.io

# For production:
WEB_APP_URL=https://your-domain.com
```

### 2. Local Development

For local testing, you need to expose your local server to the internet using **ngrok**:

#### Install ngrok:
```bash
# Windows (using Chocolatey)
choco install ngrok

# Or download from: https://ngrok.com/download
```

#### Start ngrok:
```bash
# In a separate terminal
ngrok http 3000
```

This will give you a public URL like: `https://abc123.ngrok.io`

#### Update .env:
```bash
WEB_APP_URL=https://abc123.ngrok.io
```

### 3. Start the Bot

```bash
npm start
```

You should see:
```
✅ PNPtv Bot is running!
📱 Bot username: @PNPtvbot
🔗 Start chatting: https://t.me/PNPtvbot

🌐 Mini App available at: http://localhost:3000
```

### 4. Test the Mini App

1. Open Telegram and start your bot: `/start`
2. Click the **"🚀 Open Mini App"** button
3. The Mini App should open inside Telegram

## Production Deployment

### Option 1: Deploy to VPS (Recommended)

1. **Setup a server** (DigitalOcean, AWS, etc.)
2. **Install Node.js and dependencies**
3. **Setup Nginx as reverse proxy**
4. **Get SSL certificate** (Let's Encrypt)
5. **Configure domain** to point to your server
6. **Update .env** with your domain:
   ```bash
   WEB_APP_URL=https://miniapp.yourdomain.com
   ```

### Option 2: Deploy to Heroku

1. **Create Heroku app**
2. **Add environment variables** in Heroku dashboard
3. **Deploy code**:
   ```bash
   git push heroku main
   ```
4. **Update .env**:
   ```bash
   WEB_APP_URL=https://your-app.herokuapp.com
   ```

### Option 3: Deploy to Vercel/Netlify

For the web server, you can use Vercel or Netlify for the static frontend and a separate service for the API.

## API Endpoints

### GET `/api/profile/:userId`
Get user profile information

**Response:**
```json
{
  "success": true,
  "user": {
    "userId": "123456",
    "username": "john_doe",
    "bio": "Hello world",
    "tier": "Silver",
    "xp": 500,
    "badges": ["Trailblazer"]
  }
}
```

### PUT `/api/profile/:userId`
Update user profile

**Body:**
```json
{
  "bio": "Updated bio"
}
```

### POST `/api/map/nearby`
Find nearby users

**Body:**
```json
{
  "userId": "123456",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "radius": 25
}
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "users": [
    {
      "userId": "789",
      "username": "jane_doe",
      "distance": 2.5,
      "distanceFormatted": "2.5 km",
      "tier": "Golden"
    }
  ]
}
```

### GET `/api/plans`
Get premium subscription plans

**Response:**
```json
{
  "success": true,
  "plans": {
    "Free": { "price": 0, "features": [...] },
    "Silver": { "price": 15, "features": [...] },
    "Golden": { "price": 40, "features": [...] }
  }
}
```

## Customization

### Changing Colors

Edit `src/web/public/styles.css`:

```css
:root {
    --primary-color: #6366f1;      /* Main brand color */
    --secondary-color: #8b5cf6;    /* Accent color */
    --gold-color: #fbbf24;         /* Golden tier */
    --silver-color: #94a3b8;       /* Silver tier */
}
```

### Adding New Pages

1. Add HTML section in `index.html`:
```html
<div id="new-page" class="page hidden">
  <!-- Your content -->
</div>
```

2. Add navigation button:
```html
<button class="nav-btn" data-page="new">
  <span class="icon">🎯</span>
  <span>New</span>
</button>
```

3. Add page logic in `app.js`:
```javascript
case "new":
  loadNewPageData();
  break;
```

## Troubleshooting

### Mini App doesn't open
- ✅ Check that `WEB_APP_URL` is set correctly in `.env`
- ✅ Ensure the URL is HTTPS (Telegram requires it)
- ✅ Verify ngrok is running for local development
- ✅ Check web server is running on the correct port

### API returns 404
- ✅ Ensure web server started successfully
- ✅ Check console for server errors
- ✅ Verify Firebase is configured correctly

### Location sharing doesn't work
- ✅ Users must share location through bot first using `/map`
- ✅ Check that geolocation utils are working
- ✅ Verify Firebase location data structure

### Styles look broken
- ✅ Clear browser cache
- ✅ Check that `styles.css` is being served
- ✅ Verify Telegram theme params are loading

## Security Notes

⚠️ **Important Security Considerations:**

1. **Authentication**: In production, validate `initData` from Telegram WebApp
2. **API Protection**: Implement rate limiting on API endpoints
3. **HTTPS Only**: Always use HTTPS in production
4. **Input Validation**: Sanitize all user inputs
5. **Environment Variables**: Never commit `.env` to git

## Next Steps

- [ ] Implement photo serving via Telegram File API
- [ ] Add real-time location updates
- [ ] Implement live streaming functionality
- [ ] Add in-app payments for premium subscriptions
- [ ] Add push notifications
- [ ] Implement chat between nearby users

## Support

For issues or questions:
- 📧 Open an issue on GitHub
- 💬 Contact support through the bot: `/help`
- 📚 Read Telegram Mini Apps docs: https://core.telegram.org/bots/webapps

---

Made with ❤️ for PNPtv Community
