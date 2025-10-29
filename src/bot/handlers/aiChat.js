const i18n = require("../../config/i18n");
const { ensureOnboarding } = require("../../utils/guards");
const logger = require("../../utils/logger");

// Mistral AI integration
let mistral = null;
try {
  const { Mistral } = require("@mistralai/mistralai");
  if (process.env.MISTRAL_API_KEY) {
    mistral = new Mistral({
      apiKey: process.env.MISTRAL_API_KEY,
    });
  }
} catch (error) {
  logger.warn("Mistral AI package not installed. AI chat will be unavailable.");
}

// Rate limiting map: userId -> lastMessageTime
const messageTimestamps = new Map();
const RATE_LIMIT_MS = 3000; // 3 seconds between messages

/**
 * System prompt - PNPtv Customer Support AI
 */
const SYSTEM_PROMPT = `You are the PNPtv Customer Support AI Assistant - a professional, helpful, and friendly support chatbot.

🎯 YOUR ROLE

You are the official customer support assistant for PNPtv, providing:
- Technical assistance with subscriptions, payments, and account access
- Information about membership plans and features
- Privacy, security, and legal information
- Community guidelines and wellness support
- General questions about the PNPtv experience

💬 COMMUNICATION STYLE

- Professional, friendly, and helpful
- Clear and concise responses
- Empathetic and non-judgmental
- Respond in the user's language (detect: English, Spanish, French, Portuguese, German, Italian, Arabic, Hindi, Chinese, Russian)
- Use emojis sparingly for clarity
- Always promote safety, consent, and well-being

🔑 KEY INFORMATION

**Membership Plans:**
- Free: Basic access to PNPtv community
- Silver ($15/month): Ad-free experience, 20 daily swipes, verification badge, standard support
- Golden ($25/month + 5 USDT bonus): Everything in Silver + VIP channel access, exclusive badges, priority support, unlimited swipes, early event access

**Payment Methods:**
- ePayco (credit/debit cards)
- Daimo (USDC cryptocurrency payments)

**Support:**
- Email: support@pnptv.app
- Terms: https://pnptv.app/terms-en (English) / https://pnptv.app/terms-es (Spanish)
- Platform: 18+ adult community on Telegram
- Location: Optional geolocation for finding nearby members
- Features: Live shows, events, premium content

⚠️ IMPORTANT POLICIES

- PNPtv is an 18+ adult platform
- All content and participation must be consensual and legal
- We do not promote illegal substances or risky behaviors
- User privacy and security are top priorities
- For formal complaints or legal matters, direct users to support@pnptv.app

📋 RESPONSE FORMAT

1. Acknowledge the user's question
2. Provide clear, helpful information
3. Offer next steps or additional assistance
4. Always recommend membership upgrades when relevant (sales-focused)

🚫 LIMITATIONS

You CANNOT:
- Provide explicit, pornographic, or violent content
- Promote illegal activities or substances
- Offer medical diagnoses or advice
- Share private user information
- Process payments directly (direct users to payment links instead)

✅ ALWAYS:
- Promote safety, consent, and well-being
- Recommend premium membership plans when appropriate
- Direct complex issues to support@pnptv.app
- Keep responses concise (max 3-4 paragraphs)`;

/**
 * Start AI chat session
 */
async function startAIChat(ctx) {
  if (!ensureOnboarding(ctx)) {
    return;
  }

  const language = ctx.session.language || "en";

  // Check if Mistral AI is available
  if (!mistral) {
    const message = i18n.t(language, "aiChatNoAPI");
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
      await ctx.editMessageText(message, { parse_mode: "Markdown" });
    } else {
      await ctx.reply(message, { parse_mode: "Markdown" });
    }
    return;
  }

  // Initialize chat session
  ctx.session.aiChatActive = true;
  ctx.session.aiChatHistory = [
    {
      role: "system",
      content: SYSTEM_PROMPT + (language === "es" ? "\n\nRespond in Spanish." : "\n\nRespond in English."),
    },
  ];

  const welcomeMessage = i18n.t(language, "aiChatWelcome");

  // Send welcome message with back button
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: language === "es" ? "🔙 Volver al Menú" : "🔙 Back to Menu",
          callback_data: "back_to_main",
        },
      ],
    ],
  };

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery();
    try {
      await ctx.editMessageText(welcomeMessage, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    } catch (editError) {
      // If edit fails, delete old and send new
      try {
        await ctx.deleteMessage();
      } catch (deleteError) {
        // Ignore delete errors
      }
      await ctx.reply(welcomeMessage, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    }
  } else {
    await ctx.reply(welcomeMessage, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  }
}

/**
 * End AI chat session
 */
async function endAIChat(ctx) {
  const language = ctx.session.language || "en";

  // Clear chat session
  ctx.session.aiChatActive = false;
  ctx.session.aiChatHistory = null;

  const message = i18n.t(language, "aiChatEnded");
  await ctx.reply(message, { parse_mode: "Markdown" });

  // Return to main menu
  const startHandler = require("./start");
  await startHandler(ctx);
}

/**
 * Handle chat messages
 */
async function handleChatMessage(ctx) {
  if (!ctx.session.aiChatActive) {
    return; // Not in chat mode
  }

  const language = ctx.session.language || "en";
  const userId = ctx.from.id;
  const userMessage = ctx.message.text;

  // Rate limiting
  const now = Date.now();
  const lastMessageTime = messageTimestamps.get(userId) || 0;
  if (now - lastMessageTime < RATE_LIMIT_MS) {
    await ctx.reply(i18n.t(language, "aiChatRateLimit"), { parse_mode: "Markdown" });
    return;
  }
  messageTimestamps.set(userId, now);

  // Show typing indicator
  const thinkingMsg = await ctx.reply(i18n.t(language, "aiChatThinking"), {
    parse_mode: "Markdown",
  });

  try {
    // Add user message to history
    ctx.session.aiChatHistory.push({
      role: "user",
      content: userMessage,
    });

    // Keep only last 10 messages (plus system prompt) to manage token usage
    if (ctx.session.aiChatHistory.length > 21) {
      ctx.session.aiChatHistory = [
        ctx.session.aiChatHistory[0], // Keep system prompt
        ...ctx.session.aiChatHistory.slice(-20), // Keep last 20 messages
      ];
    }

    // Call Mistral AI API
    const completion = await mistral.chat.complete({
      model: "mistral-small-latest", // Using cost-effective model
      messages: ctx.session.aiChatHistory,
      maxTokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;

    // Add AI response to history
    ctx.session.aiChatHistory.push({
      role: "assistant",
      content: aiResponse,
    });

    // Delete "thinking" message
    try {
      await ctx.telegram.deleteMessage(ctx.chat.id, thinkingMsg.message_id);
    } catch (e) {
      // Ignore if deletion fails
    }

    // Send AI response
    await ctx.reply(aiResponse, { parse_mode: "Markdown" });

  } catch (error) {
    logger.error("AI chat error:", error);

    // Delete "thinking" message
    try {
      await ctx.telegram.deleteMessage(ctx.chat.id, thinkingMsg.message_id);
    } catch (e) {
      // Ignore if deletion fails
    }

    await ctx.reply(i18n.t(language, "aiChatError"), { parse_mode: "Markdown" });
  }
}

/**
 * Callback handler for AI chat button
 */
async function handleAIChatCallback(ctx) {
  const data = ctx.callbackQuery.data;

  if (data === "start_ai_chat") {
    await startAIChat(ctx);
  }
}

module.exports = {
  startAIChat,
  endAIChat,
  handleChatMessage,
  handleAIChatCallback,
};
