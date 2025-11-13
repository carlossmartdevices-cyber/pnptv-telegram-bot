# Webhook Setup Guide

This bot now supports **both webhook mode (production)** and **polling mode (development)**.

## 🔄 How It Works

The bot automatically selects the appropriate mode:

- **Webhook Mode**: Used when `NODE_ENV=production` OR `USE_WEBHOOK=true`
- **Polling Mode**: Used in development (default)

## 🚀 Production Setup (Webhook Mode)

### Prerequisites

1. **HTTPS Domain**: Telegram webhooks require HTTPS. You need:
   - A public domain (e.g., `https://yourdomain.com`)
   - SSL certificate (provided by services like Vercel, Heroku, Railway, etc.)

2. **Environment Variables**:

```bash
# Required for webhook mode
NODE_ENV=production
USE_WEBHOOK=true
BOT_URL=https://yourdomain.com

# Standard bot configuration
TELEGRAM_TOKEN=your_bot_token_here
PORT=3000  # Optional, defaults to 3000

# Firebase
FIREBASE_CREDENTIALS={"type":"service_account",...}
FIREBASE_PROJECT_ID=your_project_id

# Daimo Payment (if using)
DAIMO_API_KEY=your_daimo_api_key
DAIMO_APP_ID=your_app_id
DAIMO_WEBHOOK_TOKEN=your_webhook_token
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_REFUND_ADDRESS=0x...

# Mistral AI (if using)
MISTRAL_API_KEY=your_mistral_key
MISTRAL_AGENT_ID=your_agent_id

# Sentry (optional)
SENTRY_DSN=your_sentry_dsn

# Admin
ADMIN_IDS=123456789,987654321
```

### Deployment Steps

#### Option 1: Vercel/Railway/Render

1. Push your code to GitHub
2. Connect repository to hosting platform
3. Set environment variables in dashboard
4. Deploy!

The webhook will be automatically configured at: `https://yourdomain.com/webhook/telegram`

#### Option 2: VPS/Server

1. Clone repository on server
2. Install dependencies: `npm install`
3. Create `.env` file with production config
4. Start with PM2: `pm2 start start-bot.js --name pnptv-bot`
5. Set up reverse proxy (Nginx/Caddy) with SSL

Example Nginx config:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🛠️ Development Setup (Polling Mode)

For local development, simply run:

```bash
npm run dev
# or
npm start
```

The bot will automatically use **polling mode** (no webhook needed).

Make sure `USE_WEBHOOK` is NOT set to `true` in your local `.env`:

```bash
# .env (local development)
TELEGRAM_TOKEN=your_bot_token
FIREBASE_CREDENTIALS=...
# DO NOT set USE_WEBHOOK=true for local dev
```

## 📡 Webhook Endpoints

Once deployed, your bot will expose these endpoints:

- `GET /health` - Health check
- `POST /webhook/telegram` - Telegram webhook (Telegram calls this)
- `POST /api/daimo/webhook` - Daimo payment webhook
- `POST /api/daimo/create-payment` - Create Daimo payment link
- `GET /api/plans/:planId` - Get plan details

## ✅ Verifying Webhook Setup

After deployment, check webhook status:

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

You should see:
```json
{
  "ok": true,
  "result": {
    "url": "https://yourdomain.com/webhook/telegram",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

## 🔧 Troubleshooting

### Webhook not receiving updates

1. **Check HTTPS**: Telegram requires HTTPS. HTTP won't work.
2. **Check BOT_URL**: Must match your actual domain
3. **Check firewall**: Port must be accessible
4. **Check logs**: `pm2 logs pnptv-bot` or check platform logs

### Switching from polling to webhook

If you were using polling before:

1. Set `USE_WEBHOOK=true` and `BOT_URL=https://...`
2. Restart the bot
3. The bot will automatically remove old webhook and set new one

### Switching from webhook to polling

1. Set `USE_WEBHOOK=false` or remove it
2. Restart the bot
3. The bot will automatically delete webhook

## 🎯 Benefits of Webhook Mode

✅ **More efficient** - No constant polling
✅ **Lower latency** - Instant updates
✅ **Scalable** - Works with serverless platforms
✅ **Production-ready** - Industry standard for bots

## 📊 Performance Comparison

| Mode | Updates/sec | Latency | Server Load | Cost |
|------|-------------|---------|-------------|------|
| Polling | ~1/sec | 1-3s | High | Higher |
| Webhook | Instant | <100ms | Low | Lower |

## 🔐 Security

The webhook endpoint (`/webhook/telegram`) is automatically secured by Telegraf. Only valid Telegram updates are processed.

For Daimo webhooks, we use:
- Basic authentication (`DAIMO_WEBHOOK_TOKEN`)
- HMAC signature verification (optional)

## 📝 Notes

- **Development**: Always use polling mode locally (easier debugging)
- **Production**: Always use webhook mode (better performance)
- **Ngrok**: For testing webhooks locally, use ngrok: `ngrok http 3000`

## 🆘 Support

If you encounter issues:
1. Check logs for error messages
2. Verify environment variables
3. Test with `/health` endpoint
4. Check webhook info with Telegram API
