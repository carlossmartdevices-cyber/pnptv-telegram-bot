const { t } = require("../../utils/i18n");
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

**Payment Methods:**
- **Daimo Pay (RECOMMENDED)**: Pay with USDC stablecoin - instant automatic activation
  • Ultra-low fees on Base Network (blockchain)
  • Accept payments from: Coinbase, Binance, Venmo, Cash App, Zelle, Revolut, Wise, any crypto wallet
  • Secure blockchain payment with instant activation
  • No credit card needed
  • Command: /subscribe then select Daimo Pay option
- Manual activation by admin after payment confirmation (alternative method)

**What Members Get:**
- Dozens of full-length adult videos featuring Santino and his boys
- Access to exclusive Telegram members group
- Geolocation tool to connect with other members in your area
- Live shows, events, and premium content

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
5. **For payment questions, always recommend Daimo Pay as the fastest and easiest option**

💳 DAIMO PAY RECOMMENDATIONS

When users ask about payments or subscriptions:
- Highlight Daimo Pay as the PREFERRED method (instant activation, no waiting)
- Mention it works with popular apps (Coinbase, Venmo, Cash App, etc.)
- Emphasize: "No credit card needed, just USDC stablecoin"
- Low fees on Base Network
- Always mention: Use /subscribe command to see Daimo Pay option

🚫 LIMITATIONS

You CANNOT:
- Provide explicit, pornographic, or violent content
- Promote illegal activities or substances
- Offer medical diagnoses or advice
- Share private user information
- Process payments directly (direct users to /subscribe command and Daimo Pay instead)
- Provide payment links manually (system generates them automatically)

✅ ALWAYS:
- Promote safety, consent, and well-being
- Recommend premium membership plans when appropriate
- **Recommend Daimo Pay for instant activation and best user experience**
- Direct complex issues to support@pnptv.app
- Keep responses concise (max 3-4 paragraphs)
- Guide users to use /subscribe command for payments`;

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
    const message = t(ctx, "aiChatNoAPI");
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

  // Initialize chat session - CLEAN UP ANY PENDING REQUESTS
  ctx.session.aiChatActive = true;
  ctx.session.aiChatHistory = [];
  ctx.session.waitingFor = null;  // Clear any pending admin/form operations
  ctx.session.editingField = null;  // Clear field editing state

  const welcomeMessage = t(ctx, "aiChatWelcome");

  // Send welcome message with back button
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: language === "es" ? "🔙 Back" : "🔙 Back",
          callback_data: "back_to_main",
        }
      ]
    ],
  };

  try {
    await ctx.reply(welcomeMessage, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } catch (error) {
    // Fallback: Send without keyboard if message is too long
    logger.warn("[AI] Welcome message failed, sending simple version:", error.message);
    await ctx.reply("🤖 *AI Support*\n\nHi! How can I help?", {
      parse_mode: "Markdown",
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

  const message = t(ctx, "aiChatEnded");
  await ctx.reply(message, { parse_mode: "Markdown" });

  // Return to main menu
  const startHandler = require("./start");
  await startHandler(ctx);
}

/**
 * Handle chat messages
 */
async function handleChatMessage(ctx) {
  // Guard: must have message text
  if (!ctx.message || !ctx.message.text) {
    return;
  }

  // Guard: must be in active chat
  if (!ctx.session?.aiChatActive) {
    return;
  }

  // Guard: if waitingFor is set, DON'T process as AI (let admin handlers take over)
  // This shouldn't happen if startAIChat cleaned it up, but double-check
  if (ctx.session?.waitingFor) {
    return;
  }

  const language = ctx.session.language || "en";
  const userId = ctx.from.id;
  const userMessage = ctx.message.text;

  // Guard: abort commands
  if (userMessage.startsWith("/")) {
    return;
  }

  // Rate limiting
  const now = Date.now();
  const lastMessageTime = messageTimestamps.get(userId) || 0;
  if (now - lastMessageTime < RATE_LIMIT_MS) {
    await ctx.reply(t(ctx, "aiChatRateLimit"), { parse_mode: "Markdown" }).catch(() => {});
    return;
  }
  messageTimestamps.set(userId, now);

  // Show typing indicator
  let thinkingMsg;
  try {
    thinkingMsg = await ctx.reply(t(ctx, "aiChatThinking"), {
      parse_mode: "Markdown",
    });
  } catch (e) {
    logger.warn("[AI] Could not send thinking message:", e.message);
  }

  try {
    // Initialize history if needed
    if (!ctx.session.aiChatHistory) {
      ctx.session.aiChatHistory = [];
    }

    // Add user message to history
    ctx.session.aiChatHistory.push({
      role: "user",
      content: userMessage,
    });

    // Keep only last 20 messages
    if (ctx.session.aiChatHistory.length > 20) {
      ctx.session.aiChatHistory = ctx.session.aiChatHistory.slice(-20);
    }

    const languagePrompt = language === "es"
      ? "Responde en español siempre."
      : "Always respond in English.";

    // Use Chat Completions API (fallback mode - no agent needed)
    const messages = [
      {
        role: "system",
        content: AGENT_INSTRUCTIONS + `\n\n${languagePrompt}`,
      },
      ...ctx.session.aiChatHistory.slice(-10),
    ];

    if (!mistral) {
      throw new Error("Mistral API not initialized");
    }

    const completion = await mistral.chat.complete({
      model: "mistral-small-latest",
      messages: messages,
      maxTokens: 200,
      temperature: 0.7,
    });

    const aiResponse = completion.choices?.[0]?.message?.content;
    if (!aiResponse) {
      throw new Error("No response from Mistral");
    }

    // Add AI response to history
    ctx.session.aiChatHistory.push({
      role: "assistant",
      content: aiResponse,
    });

    // Delete thinking message
    if (thinkingMsg) {
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, thinkingMsg.message_id);
      } catch (e) {
        // Ignore
      }
    }

    // Send response (handle long messages)
    const MAX_LENGTH = 4000;
    if (aiResponse.length > MAX_LENGTH) {
      const chunks = aiResponse.match(/[\s\S]{1,3900}/g) || [];
      for (const chunk of chunks) {
        await ctx.reply(chunk, { parse_mode: "Markdown" }).catch(() => {});
      }
    } else {
      await ctx.reply(aiResponse, { parse_mode: "Markdown" }).catch(() => {});
    }

  } catch (error) {
    logger.error("[AI Chat Error]:", {
      message: error.message,
      userId,
      stack: error.stack
    });

    // Delete thinking message
    if (thinkingMsg) {
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, thinkingMsg.message_id);
      } catch (e) {
        // Ignore
      }
    }

    const errorMsg = language === "es"
      ? "❌ Perdón, ocurrió un error. Intenta de nuevo o escribe /endchat para salir."
      : "❌ Sorry, something went wrong. Try again or type /endchat to exit.";
    
    await ctx.reply(errorMsg, { parse_mode: "Markdown" }).catch(() => {});
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
