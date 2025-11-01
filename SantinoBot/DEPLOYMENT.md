# Deployment Instructions for Santino Group Bot

## Railway Deployment

1. **Connect Repository**: Link your GitHub repository to Railway
2. **Set Environment Variables** in Railway dashboard:
   ```
   BOT_TOKEN=your_bot_token
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY="your_private_key"
   FIREBASE_CLIENT_EMAIL=your_client_email
   GROUP_ID=-1001234567890
   NODE_ENV=production
   ```
3. **Deploy**: Railway will automatically deploy from your main branch

## Heroku Deployment

1. **Create Heroku App**:
   ```bash
   heroku create santino-group-bot
   ```

2. **Set Environment Variables**:
   ```bash
   heroku config:set BOT_TOKEN=your_bot_token
   heroku config:set FIREBASE_PROJECT_ID=your_project_id
   heroku config:set FIREBASE_PRIVATE_KEY="your_private_key"
   heroku config:set FIREBASE_CLIENT_EMAIL=your_client_email
   heroku config:set GROUP_ID=-1001234567890
   ```

3. **Deploy**:
   ```bash
   git add .
   git commit -m "Deploy Santino Group Bot"
   git push heroku main
   ```

## VPS Deployment

1. **Copy files to VPS**:
   ```bash
   scp -r . user@your-vps:/path/to/santino-bot/
   ```

2. **Install dependencies**:
   ```bash
   npm install --production
   ```

3. **Set up PM2** (recommended):
   ```bash
   npm install -g pm2
   pm2 start src/bot.js --name "santino-group-bot"
   pm2 save
   pm2 startup
   ```

4. **Configure environment variables** in `.env` file

## Google Cloud Run

1. **Create Dockerfile** (already included)
2. **Build and push**:
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT-ID/santino-group-bot
   ```
3. **Deploy**:
   ```bash
   gcloud run deploy --image gcr.io/PROJECT-ID/santino-group-bot --platform managed
   ```

## Webhook Setup (Production)

For production deployments, set these additional environment variables:
```
WEBHOOK_URL=https://your-domain.com
PORT=3000
```

The bot will automatically use webhooks instead of polling when these are set.