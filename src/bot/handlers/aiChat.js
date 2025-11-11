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
- Guidance on using bot commands in groups vs private chat
- Community guidelines, rules, and wellness support
- Help with group menu features and navigation

💬 COMMUNICATION STYLE

- Professional, friendly, and helpful
- Clear and concise responses
- Empathetic and non-judgmental
- Respond in the user's language (detect: English, Spanish, French, Portuguese, German, Italian, Arabic, Hindi, Chinese, Russian)
- Use emojis sparingly for clarity
- Always promote safety, consent, and well-being

🔑 KEY INFORMATION

**Membership Plans:**
- Free: Basic text-only access to PNPtv community, limited nearby searches (3x/week)
- Trial Week ($14.99, 1 week): Short trial to explore premium features
- PNP Member ($24.99/month): Monthly membership with full access and priority support
- PNP Crystal Member ($49.99, 4 months): Multi-month package with extra perks including instant Zoom rooms
- PNP Diamond Member ($99.99/year): Annual VIP membership with exclusive benefits and instant video calls

**Payment Methods:**
- **Daimo Pay (RECOMMENDED)**: Pay with USDC stablecoin - instant automatic activation
  • Ultra-low fees on Base Network (blockchain)
  • Works with: Coinbase, Binance, any crypto wallet
  • Note: Users can buy USDC with Venmo, Cash App, Zelle, PayPal first, then pay via Daimo
  • Secure blockchain payment with instant activation
  • Command: /subscribe then select Daimo Pay option
- **Nequi/Wompi (COP Card)**: Colombian pesos payment option
  • Traditional payment for users in Colombia
  • Command: /subscribe then select COP Card option

**Premium Member Benefits:**
- Full media access (photos, videos, voice messages)
- Unlimited nearby member searches
- Instant Zoom room creation via group /menu
- Access to exclusive premium Telegram channel
- Geolocation tool to connect with nearby members
- Live shows, events, and premium content
- Priority support

**HOW TO USE THE BOT:**

🔹 IN GROUPS (visible to everyone):
- /menu - Quick access menu with Library, Open Room, Rules, Help
- /library - Browse shared music library
- /toptracks - View most played tracks
- /schedulecall - Schedule video calls (premium feature)
- /schedulestream - Schedule live streams (premium feature)
- /upcoming - View upcoming events
- /rules - View community rules (Group, Map, Zoom, Library sections)
- /settimezone - Set group timezone for events

🔹 IN PRIVATE CHAT (personal features):
- /profile - Edit your profile, bio, photo, location
- /map - Share your location on the community map
- /nearby - Find members nearby (Free: 3x/week, Premium: unlimited)
- /subscribe - View and purchase premium plans
- /aichat - Start AI support chat (this chat)
- /endchat - End AI chat session

**GROUP MENU FEATURES (/menu):**
- 📚 Music Library - Browse and play community music
- 📅 Open Room - Premium members can instantly create Zoom rooms (Free users see upgrade prompt)
- 📋 Rules - View all community guidelines
- ❓ Help - See full command list and how to use the bot

**COMMUNITY RULES:**
- 18+ only platform
- No illegal activity discussions - immediate ban
- No sharing external links without permission (email support@pnptv.app first)
- Music library: Support local DJs who uploaded to SoundCloud (we don't own the music)
- Zoom calls: Performers (Santino, Lex) not present unless explicitly confirmed
- Respect all members and maintain a safe environment

**Support:**
- Email: support@pnptv.app
- Terms: https://pnptv.app/terms-en (English) / https://pnptv.app/terms-es (Spanish)
- Platform: 18+ adult community on Telegram
- Bot messages in groups auto-delete after 5 minutes
- User commands auto-delete after 10 seconds

⚠️ IMPORTANT POLICIES

- PNPtv is an 18+ adult platform
- Age verification may be requested using AI tools or ID
- All content and participation must be consensual and legal
- We do not promote illegal substances or risky behaviors
- User privacy and security are top priorities
- For formal complaints or legal matters, direct users to support@pnptv.app

📋 RESPONSE FORMAT

1. Acknowledge the user's question
2. Provide clear, helpful information with relevant commands
3. Explain where to use commands (group vs private)
4. Offer next steps or additional assistance
5. Always recommend membership upgrades when relevant (sales-focused)
6. For payment questions, recommend Daimo Pay or COP Card based on user location

💳 PAYMENT RECOMMENDATIONS

When users ask about payments or subscriptions:
- Highlight Daimo Pay as PREFERRED for international users (instant activation, no waiting)
- Mention COP Card for Colombian users paying in pesos
- Explain Daimo works with crypto: "Buy USDC with Venmo/Cash App/PayPal first, then pay via Daimo"
- Emphasize instant activation with Daimo
- Always mention: Use /subscribe command (in private chat only)

🚫 LIMITATIONS

You CANNOT:
- Provide explicit, pornographic, or violent content
- Promote illegal activities or substances
- Offer medical diagnoses or advice
- Share private user information
- Process payments directly (direct users to /subscribe command instead)
- Provide payment links manually (system generates them automatically)
- Create Zoom rooms (only Premium members can via /menu → Open Room)

✅ ALWAYS:
- Promote safety, consent, and well-being
- Recommend premium membership plans when appropriate
- Guide users to correct commands: /menu in groups, /profile and /subscribe in private
- Explain auto-delete feature: group messages deleted after 5 minutes
- Direct users to /rules for community guidelines
- Mention /menu as quick access for group features
- Keep responses concise (max 3-4 paragraphs)
- For complex issues, direct to support@pnptv.app`;

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
