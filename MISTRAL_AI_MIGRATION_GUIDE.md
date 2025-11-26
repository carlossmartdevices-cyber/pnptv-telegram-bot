# Mistral AI Migration Guide for PNPtv Bot

## Overview

This guide documents the migration from OpenAI to Mistral AI (Le Chat) for the PNPtv customer support chatbot.

## What Changed

### 1. **Button & Branding**
- **Old**: "💎 Cristina Crystal" - AI personality
- **New**: "🤖 Customer Support Chat Bot" - Professional support bot

### 2. **AI Provider**
- **Old**: OpenAI (GPT-4o-mini)
- **New**: Mistral AI (mistral-small-latest)

### 3. **System Prompt**
- Removed "Cristina Crystal" character and seductive/neon aesthetic
- Added professional customer support AI personality
- **Sales-focused**: Now recommends premium memberships in responses
- Maintains multilingual support (10 languages)
- Emphasizes safety, consent, and well-being

## Setup Instructions

### Step 1: Get Mistral AI API Key

1. **Create account**: Visit [console.mistral.ai](https://console.mistral.ai)
2. **Organization settings**: Go to [admin.mistral.ai](https://admin.mistral.ai)
3. **Set up billing**: Navigate to Administration section
4. **Generate API key**:
   - Go to API keys page
   - Click "Create new key"
   - **IMPORTANT**: Copy the key immediately and save it securely
   - The key will only be shown once!

### Step 2: Update Environment Variables

Add to your `.env` file (or `.env.production` for production):

```bash
# Mistral AI Configuration
MISTRAL_API_KEY=your_mistral_api_key_here
```

**Note**: You can remove `OPENAI_API_KEY` if you're no longer using it.

### Step 3: Install Dependencies

The Mistral AI SDK has been added to `package.json`:

```bash
npm install @mistralai/mistralai
```

This has already been done locally. On deployment, the server will automatically install it.

### Step 4: Deploy to Hostinger

Use the automated deployment script:

```bash
./deploy-auto.sh
```

Or manually:

```bash
# Upload files
scp .env.production root@72.60.29.80:/var/www/telegram-bot/.env
scp package.json root@72.60.29.80:/var/www/telegram-bot/
scp -r src/ root@72.60.29.80:/var/www/telegram-bot/

# SSH into server
ssh root@72.60.29.80

# Navigate to bot directory
cd /var/www/telegram-bot

# Install dependencies
npm install --production

# Restart bot
pm2 restart pnptv-bot
pm2 save
```

## Code Changes Summary

### Files Modified:

1. **[src/bot/handlers/aiChat.js](src/bot/handlers/aiChat.js)**
   - Changed from `OpenAI` to `Mistral`
   - Updated API calls from `openai.chat.completions.create()` to `mistral.chat.complete()`
   - Replaced system prompt with professional support bot personality
   - Changed model from `gpt-4o-mini` to `mistral-small-latest`

2. **[src/config/menus.js](src/config/menus.js)**
   - Updated button text from "💎 Cristina Crystal" to "🤖 Customer Support"
   - Both English and Spanish versions updated

3. **[src/bot/handlers/help.js](src/bot/handlers/help.js)**
   - Updated inline button from "Talk with Cristina Crystal" to "Customer Support Chat Bot"

4. **[src/locales/en.json](src/locales/en.json)** & **[src/locales/es.json](src/locales/es.json)**
   - Updated all AI chat related strings
   - Changed welcome message to professional support greeting
   - Updated button text
   - Simplified error and status messages

5. **[package.json](package.json)**
   - Added `@mistralai/mistralai` dependency

## API Comparison

### OpenAI (Old)
```javascript
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: chatHistory,
  max_tokens: 500,
  temperature: 0.7,
});
```

### Mistral AI (New)
```javascript
const { Mistral } = require("@mistralai/mistralai");
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const completion = await mistral.chat.complete({
  model: "mistral-small-latest",
  messages: chatHistory,
  maxTokens: 500,
  temperature: 0.7,
});
```

## Mistral AI Models Available

- **mistral-small-latest**: Cost-effective, fast, good for customer support (currently using)
- **mistral-medium-latest**: Balanced performance and cost
- **mistral-large-latest**: Most powerful, best quality
- **codestral-latest**: Specialized for code generation

## Pricing Comparison (as of 2025)

### Mistral AI (mistral-small-latest)
- Input: ~$0.20 per 1M tokens
- Output: ~$0.60 per 1M tokens
- **More affordable than OpenAI**

### OpenAI (gpt-4o-mini)
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

*Mistral is competitive and offers European data hosting (GDPR compliant)*

## Features & Benefits

### Why Mistral AI?

1. **Cost-Effective**: Similar or lower pricing than OpenAI
2. **European**: Based in France, GDPR compliant
3. **Fast**: Low latency responses
4. **Multilingual**: Excellent support for Spanish, French, and other languages
5. **Open Source**: Some models available open-source
6. **Le Chat**: Consumer-facing interface powered by same API

### Customer Support Features

The new chatbot is configured to:
- **Always recommend memberships** (sales-focused)
- Provide technical support for subscriptions
- Answer questions about payment methods
- Explain privacy and legal policies
- Maintain professional, helpful tone
- Support 10 languages automatically

## Testing

### Test the Bot

1. Open Telegram: [@PNPtvBot](https://t.me/PNPtvBot)
2. Click "🤖 Customer Support" button
3. Ask questions like:
   - "What membership plans do you have?"
   - "How do I subscribe?"
   - "What payment methods are available?"
   - "Tell me about privacy"

### Expected Behavior

- Bot should respond in your language
- Responses should be professional and helpful
- Bot should recommend premium plans when relevant
- Rate limiting: 3 seconds between messages

## Troubleshooting

### "AI support is currently unavailable"

**Cause**: `MISTRAL_API_KEY` not set in environment variables

**Solution**:
```bash
# Check if key is set
ssh root@72.60.29.80
cd /var/www/telegram-bot
cat .env | grep MISTRAL

# Add if missing
echo "MISTRAL_API_KEY=your_key_here" >> .env
pm2 restart pnptv-bot
```

### Bot not responding

**Check logs**:
```bash
ssh root@72.60.29.80
pm2 logs pnptv-bot
```

**Look for**:
- API key errors
- Rate limiting errors
- Network connectivity issues

### API Errors

If you see Mistral API errors:
1. Check API key is valid
2. Verify billing is set up at [admin.mistral.ai](https://admin.mistral.ai)
3. Check quota limits
4. Review [Mistral API status](https://status.mistral.ai)

## Monitoring & Logs

### View bot logs
```bash
pm2 logs pnptv-bot --lines 100
```

### Check bot status
```bash
pm2 status pnptv-bot
```

### Monitor API usage
- Visit [console.mistral.ai](https://console.mistral.ai)
- Navigate to "Usage" section
- Monitor token consumption and costs

## Rollback (If Needed)

If you need to revert to OpenAI:

1. Change `MISTRAL_API_KEY` back to `OPENAI_API_KEY` in `.env`
2. Restore [src/bot/handlers/aiChat.js](src/bot/handlers/aiChat.js) from git:
   ```bash
   git checkout HEAD~1 -- src/bot/handlers/aiChat.js
   ```
3. Restart bot: `pm2 restart pnptv-bot`

## Next Steps

1. ✅ Get Mistral API key from [console.mistral.ai](https://console.mistral.ai)
2. ✅ Add `MISTRAL_API_KEY` to `.env.production`
3. ✅ Deploy to Hostinger using `./deploy-auto.sh`
4. ✅ Test the chatbot on Telegram
5. ✅ Monitor logs and usage
6. ✅ Collect user feedback

## Support

- **Mistral AI Docs**: https://docs.mistral.ai
- **Mistral Console**: https://console.mistral.ai
- **PNPtv Support**: support@pnptv.app

---

**Migration completed**: 2025-10-29
**Bot URL**: https://pnptv.app
**Telegram**: [@PNPtvBot](https://t.me/PNPtvBot)
