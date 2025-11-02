const i18n = require("../../config/i18n");
const { ensureOnboarding } = require("../../utils/guards");
const logger = require("../../utils/logger");

// Mistral AI integration
let mistral = null;
let AGENT_ID = null;

try {
  const { Mistral } = require("@mistralai/mistralai");
  if (process.env.MISTRAL_API_KEY) {
    mistral = new Mistral({
      apiKey: process.env.MISTRAL_API_KEY,
    });

    // Initialize agent on startup (will be created if not exists)
    initializeAgent().catch(err => {
      logger.error("Failed to initialize Mistral agent:", err);
    });
  }
} catch (error) {
  logger.warn("Mistral AI package not installed. AI chat will be unavailable.");
}

// Rate limiting map: userId -> lastMessageTime
const messageTimestamps = new Map();
const RATE_LIMIT_MS = 3000; // 3 seconds between messages

/**
 * Agent instructions - PNPtv Customer Support AI
 */
const AGENT_INSTRUCTIONS = `You are the PNPtv Customer Support AI Assistant - a professional, helpful, and friendly support chatbot.

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
- Trial Week ($14.99, 1 week): Short trial to explore premium features
- PNP Member ($24.99/month): Monthly membership with full access and priority support
- PNP Crystal Member ($49.99, 4 months): Multi-month package with extra perks
- PNP Diamond Member ($99.99/year): Annual VIP membership with exclusive benefits

Available payment method:
- Daimo Pay (USDC stablecoin)

To subscribe, use the /subscribe command.

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
 * Initialize or get the Mistral AI Agent
 * Note: Agents must be created via Mistral console (https://console.mistral.ai)
 * or the environment variable MISTRAL_AGENT_ID can be set
 */
async function initializeAgent() {
  if (!mistral) return null;

  try {
    // Check if agent ID is provided in environment
    if (process.env.MISTRAL_AGENT_ID) {
      AGENT_ID = process.env.MISTRAL_AGENT_ID;
      logger.info(`Using Mistral agent from env: ${AGENT_ID}`);
      return AGENT_ID;
    }

    // If no agent ID provided, we'll use chat completion instead
    logger.info("No MISTRAL_AGENT_ID configured, will use standard chat completion API");
    AGENT_ID = null;
    return null;
  } catch (error) {
    logger.error("Error initializing Mistral agent:", error);
    return null;
  }
}

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
    const message = i18n.getText(language, "aiChatNoAPI");
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
      await ctx.editMessageText(message, { parse_mode: "Markdown" });
    } else {
      await ctx.reply(message, { parse_mode: "Markdown" });
    }
    return;
  }

  // Ensure agent is initialized (optional - will fall back to chat completion if not)
  if (AGENT_ID === null && mistral) {
    await initializeAgent();
  }

  // Initialize chat session
  ctx.session.aiChatActive = true;
  ctx.session.aiChatHistory = [];

  const welcomeMessage = i18n.getText(language, "aiChatWelcome");

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

  const message = i18n.getText(language, "aiChatEnded");
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
    await ctx.reply(i18n.getText(language, "aiChatRateLimit"), { parse_mode: "Markdown" });
    return;
  }
  messageTimestamps.set(userId, now);

  // Show typing indicator
  const thinkingMsg = await ctx.reply(i18n.getText(language, "aiChatThinking"), {
    parse_mode: "Markdown",
  });

  try {
    // Ensure agent is initialized
    if (AGENT_ID === null && mistral) {
      await initializeAgent();
    }

    // Add user message to history
    ctx.session.aiChatHistory.push({
      role: "user",
      content: userMessage,
    });

    // Keep only last 20 messages to manage token usage
    if (ctx.session.aiChatHistory.length > 20) {
      ctx.session.aiChatHistory = ctx.session.aiChatHistory.slice(-20);
    }

    // Prepare messages with language preference
    const languagePrompt = language === "es"
      ? "Responde en español."
      : "Respond in English.";

    let completion;
    let aiResponse;

    // Use Agents API if agent ID is configured
    if (AGENT_ID) {
      const messages = [
        ...ctx.session.aiChatHistory.slice(-10), // Last 10 messages for context
        {
          role: "user",
          content: `${languagePrompt}\n\n${userMessage}`,
        }
      ];

      completion = await mistral.agents.complete({
        agentId: AGENT_ID,
        messages: messages,
      });

      aiResponse = completion.choices?.[0]?.message?.content ||
                  completion.message?.content ||
                  "I apologize, but I couldn't process your request. Please try again.";
    } else {
      // Fall back to Chat Completions API
      const messages = [
        {
          role: "system",
          content: AGENT_INSTRUCTIONS + `\n\n${languagePrompt}`,
        },
        ...ctx.session.aiChatHistory.slice(-10), // Last 10 messages
      ];

      completion = await mistral.chat.complete({
        model: "mistral-small-latest",
        messages: messages,
        maxTokens: 500,
        temperature: 0.7,
      });

      aiResponse = completion.choices[0].message.content;
    }

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

    await ctx.reply(i18n.getText(language, "aiChatError"), { parse_mode: "Markdown" });
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
