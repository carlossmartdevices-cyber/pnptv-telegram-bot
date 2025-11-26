# AI Support Bot (Cristina Crystal) - Environment Configuration

## Overview
The AI Support Bot (also known as "Cristina Crystal") is fully integrated into the PNPtv Telegram bot system. It provides professional customer support using Mistral AI.

## ✅ Configuration Status
- **AI Chat Handler**: `src/bot/handlers/aiChat.js` ✅ Configured
- **Bot Integration**: Commands and routing ✅ Active  
- **UI Integration**: Help menu button ✅ Working
- **Dependencies**: `@mistralai/mistralai` ✅ Installed
- **Multi-language**: English/Spanish ✅ Supported

## 🔧 Required Environment Variables

### Essential for AI Functionality
```bash
# Mistral AI Configuration (Required)
MISTRAL_API_KEY=your_mistral_api_key_here
```

### Optional Advanced Features
```bash
# Mistral Agent ID (Optional - uses chat completion if not set)
MISTRAL_AGENT_ID=ag_xxxxxxxxxxxxxxxxx
```

## 🚀 How Users Access AI Support

### Method 1: Through Menu System
1. User starts bot with `/start`
2. Clicks "🤖 PNPtv! Support" button
3. Clicks "🤖 Customer Support Chat Bot" button
4. AI chat session begins

### Method 2: Direct Commands
- `/aichat` - Start AI support chat
- `/endchat` - End AI support chat

## 🤖 AI Agent Capabilities

### Professional Customer Support
- Subscription plan information and recommendations
- Payment troubleshooting (ePayco, Daimo)
- Account access and technical issues
- Community guidelines and safety
- Privacy and security questions

### Multi-language Support
- **English**: Default language
- **Spanish**: Automatic detection and response
- **Other Languages**: Detects user language from input

### Smart Features
- **Rate Limiting**: 3-second cooldown between messages
- **Session Management**: Maintains conversation context
- **Error Handling**: Graceful fallbacks and logging
- **Sales Integration**: Promotes premium memberships
- **Professional Tone**: Helpful, empathetic, non-judgmental

## 🎯 Agent Instructions Summary

The AI is configured as a professional PNPtv customer support assistant with:

- **Role**: Official customer support for adult 18+ platform
- **Tone**: Professional, friendly, helpful, empathetic
- **Knowledge**: Membership plans, payments, technical support
- **Safety**: Promotes consent, well-being, and legal compliance
- **Sales**: Recommends premium memberships when appropriate
- **Escalation**: Directs complex issues to support@pnptv.app

## 🔒 Security & Privacy

### Content Restrictions
- ❌ No explicit, pornographic, or violent content
- ❌ No illegal activities or substance promotion  
- ❌ No medical diagnoses or advice
- ❌ No private user information sharing
- ❌ No direct payment processing

### Privacy Protection
- Conversation history limited to last 20 messages
- No persistent storage of chat content
- User data handled according to PNPtv privacy policy
- Secure API communication with Mistral AI

## 📊 Technical Implementation

### API Integration
- **Primary**: Mistral Agents API (if MISTRAL_AGENT_ID set)
- **Fallback**: Mistral Chat Completions API
- **Model**: mistral-small-latest (for fallback mode)
- **Token Limit**: 500 tokens per response
- **Temperature**: 0.7 (balanced creativity/consistency)

### Session State Management
```javascript
ctx.session.aiChatActive = true|false
ctx.session.aiChatHistory = [messages...]
```

### Error Handling
- Graceful API failures with user-friendly messages
- Automatic fallback from Agents to Chat Completions
- Rate limiting protection with informative messages
- Logging for debugging and monitoring

## 🚀 Deployment Checklist

### Environment Setup
- [ ] Set `MISTRAL_API_KEY` in production environment
- [ ] Optionally set `MISTRAL_AGENT_ID` for advanced features
- [ ] Verify `@mistralai/mistralai` dependency is installed
- [ ] Test AI chat functionality before deployment

### Testing Commands
```bash
# Test AI support bot configuration
node test-ai-support-bot.js

# Manual testing in Telegram
/aichat
# Send test message
/endchat
```

## 🔄 Status: FULLY OPERATIONAL

The AI Support Bot (Cristina Crystal) is completely configured and ready for production use. Users can access professional customer support through the intuitive menu system or direct commands.

**Last Updated**: January 2025
**Integration Status**: ✅ Complete
**Testing Status**: ✅ Verified