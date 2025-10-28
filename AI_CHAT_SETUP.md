# AI Chat Integration Guide

## Overview

Your PNPtv bot now includes an AI-powered chat assistant powered by OpenAI's GPT-4o-mini model. Users can interact with the AI to get help with:

- Membership plans & features
- How to use the platform
- Community guidelines
- Privacy & safety tips
- General questions

## Features

### 1. **Multiple Access Points**
- **Main Menu Button**: "🤖 AI Chat" / "🤖 Chat IA"
- **Help Section Button**: "🤖 Chat with PNPtv! Support" / "🤖 Chat con Soporte PNPtv!"
- **Command**: `/aichat`

### 2. **Conversation Management**
- Maintains conversation history (last 20 messages)
- Rate limiting: 3 seconds between messages
- Bilingual support (English/Spanish)
- Context-aware responses about PNPtv

### 3. **Smart System Prompt**
The AI has been trained with PNPtv-specific knowledge:
- Membership tiers (Free, Silver, Golden)
- Platform features
- Community rules
- Terms & privacy policy links
- Support contact information

## Setup Instructions

### Step 1: Get OpenAI API Key

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the API key (you won't see it again!)

### Step 2: Configure Environment Variable

Add to your `.env` file:

```bash
# AI Chat Integration
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Restart Your Bot

```bash
# If running locally
npm start

# If on production server
pm2 restart pnptv-bot
```

## Usage

### For Users

1. **Start Chat**:
   - Click "🤖 AI Chat" on main menu, OR
   - Click "🤖 Chat with PNPtv! Support" in help section, OR
   - Send `/aichat` command

2. **Chat**:
   - Type any message
   - AI responds with helpful information
   - Conversation continues naturally

3. **End Chat**:
   - Type `/endchat`
   - Returns to main menu

### Example Conversations

**English:**
```
User: What membership plans do you have?
AI: We have three membership tiers:
- Free: Basic access to community
- Silver ($15/month): Ad-free, 20 swipes/day, verification badge
- Golden ($25/month + 5 USDT): VIP access, unlimited swipes, priority support...
```

**Spanish:**
```
Usuario: ¿Cómo funciona la geolocalización?
IA: La geolocalización es opcional y te permite descubrir miembros cerca de ti...
```

## Cost Management

The integration uses **GPT-4o-mini**, which is cost-effective:
- ~$0.150 per 1M input tokens
- ~$0.600 per 1M output tokens
- Max 500 tokens per response

**Estimated costs** (approximate):
- 100 conversations/day = ~$0.50/day = ~$15/month
- 500 conversations/day = ~$2.50/day = ~$75/month

### Rate Limiting
- 3 seconds between messages per user
- Prevents spam and excessive API usage

## Technical Details

### Files Modified

1. **[src/bot/handlers/aiChat.js](src/bot/handlers/aiChat.js)** - NEW
   - AI chat handler with OpenAI integration
   - Conversation management
   - Rate limiting

2. **[src/bot/handlers/help.js](src/bot/handlers/help.js)**
   - Added inline button for AI chat

3. **[src/bot/index.js](src/bot/index.js)**
   - Registered AI chat commands and callbacks
   - Added text message routing for AI chat

4. **[src/config/menus.js](src/config/menus.js)**
   - Added AI Chat button to main menu

5. **[src/locales/en.json](src/locales/en.json)** & **[src/locales/es.json](src/locales/es.json)**
   - Added AI chat text strings

6. **[.env.example](.env.example)**
   - Documented OPENAI_API_KEY variable

### Session State

The AI chat uses session state:
```javascript
ctx.session.aiChatActive = true  // Chat is active
ctx.session.aiChatHistory = [...]  // Conversation history
```

### Graceful Degradation

If OpenAI API key is not configured:
- Feature shows as "unavailable"
- Users see friendly message: "AI chat is currently unavailable"
- Bot continues to work normally

## Customization

### Modify System Prompt

Edit [src/bot/handlers/aiChat.js:17-40](src/bot/handlers/aiChat.js#L17-L40) to change AI behavior:

```javascript
const SYSTEM_PROMPT = `You are a helpful AI assistant for PNPtv!...`;
```

### Change Model

In [src/bot/handlers/aiChat.js:139](src/bot/handlers/aiChat.js#L139):

```javascript
model: "gpt-4o-mini", // Options: gpt-4o, gpt-4o-mini, gpt-3.5-turbo
```

### Adjust Rate Limit

In [src/bot/handlers/aiChat.js:18](src/bot/handlers/aiChat.js#L18):

```javascript
const RATE_LIMIT_MS = 3000; // Change to desired milliseconds
```

### Change Max Tokens

In [src/bot/handlers/aiChat.js:141](src/bot/handlers/aiChat.js#L141):

```javascript
max_tokens: 500, // Change to desired token limit
```

## Monitoring

### Logs

The AI chat logs activity:
```
logger.error("AI chat error:", error);
```

Check your logs for:
- API errors
- Rate limit violations
- User conversations (if logging enabled)

### OpenAI Dashboard

Monitor usage at [OpenAI Usage Dashboard](https://platform.openai.com/usage):
- Token usage
- Cost tracking
- Request counts

## Troubleshooting

### "AI chat is currently unavailable"

**Cause**: OPENAI_API_KEY not set or invalid

**Solution**:
1. Verify `.env` has `OPENAI_API_KEY=sk-...`
2. Check API key is valid at OpenAI dashboard
3. Restart bot

### "Whoa, slow down!"

**Cause**: User sending messages too fast

**Solution**: Normal behavior - wait 3 seconds between messages

### High API costs

**Solutions**:
1. Increase rate limit (5-10 seconds)
2. Reduce max_tokens (300-400)
3. Switch to gpt-3.5-turbo (cheaper)
4. Add daily usage limits per user

## Future Enhancements

Potential improvements:
- [ ] Add conversation summaries
- [ ] Multi-turn context awareness
- [ ] User-specific customization
- [ ] Analytics dashboard
- [ ] A/B testing different prompts
- [ ] Integration with other AI providers (Anthropic Claude, etc.)

## Security Notes

- ✅ API key stored in environment variables
- ✅ No user data sent to OpenAI (only messages)
- ✅ Rate limiting prevents abuse
- ✅ Conversation history limited to 20 messages
- ⚠️ Review OpenAI's [data usage policies](https://openai.com/policies/api-data-usage-policies)

## Support

For questions or issues:
- Email: support@pnptv.app
- Check logs for error details
- OpenAI API status: https://status.openai.com/

---

**Last Updated**: 2025-10-28
**Integration Version**: 1.0.0
