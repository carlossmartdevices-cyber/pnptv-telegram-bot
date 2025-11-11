const logger = require("../../utils/logger");
const { t } = require("../../utils/i18n");
const { escapeMdV2 } = require('../../utils/telegramEscapes');

/**
 * Middleware to ensure bot responses are sent to private chat when used in groups
 * This middleware intercepts ctx.reply and other response methods to redirect them
 */
function privateResponseMiddleware() {
  return async (ctx, next) => {
    // Check if this is a group or supergroup
    const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
    
    if (!isGroup) {
      // Not a group, continue normally
      return next();
    }

    // Commands/actions that should remain in group (group management functions)
    // 
    // ✅ GROUP COMMANDS (responses stay in group chat):
    // - /status       - Bot status and health check
    // - /refresh      - Refresh bot data/cache
    // - /info         - Bot information display
    // - /library      - Browse music library with tracks
    // - /toptracks    - Show most played tracks
    // - /addtrack     - Add new music tracks (admin only)
    // - /deletetrack  - Delete music tracks (admin only)
    // - /schedulecall - Schedule video calls for group
    // - /schedulestream - Schedule live streams for group
    // - /upcoming     - View upcoming group events
    // - /settimezone  - Set timezone for events
    // - play_track:*  - Track play button callbacks
    //
    // ❌ PRIVATE COMMANDS (responses sent to private chat):
    // - /start        - Initial bot setup and onboarding
    // - /help         - Help menu and command list
    // - /map          - Location and map features
    // - /nearby       - Find nearby members
    // - /live         - Live streaming features
    // - /app          - Mini app access
    // - /profile      - User profile management
    // - /subscribe    - Subscription management
    // - /admin        - Admin panel (admin only)
    // - /plans        - Subscription plans (admin only)
    // - /aichat       - Start AI chat session
    // - /endchat      - End AI chat session
    // - /deleteevent  - Delete scheduled events
    // - /playlist     - Manage playlists
    //
    // Note: Group members will see "✉️ I've sent you the response via private message"
    // for private commands, and get a "Start Bot" button if they haven't started the bot.
    //
    const groupOnlyCommands = ['/status', '/refresh', '/info', '/menu', '/library', '/toptracks', '/addtrack', '/deletetrack', '/schedulecall', '/schedulestream', '/upcoming', '/settimezone'];
    const commandText = ctx.message?.text || ctx.callbackQuery?.data || '';
    
    // Allow group management functions to work normally
    if (groupOnlyCommands.some(cmd => commandText.startsWith(cmd)) ||
        commandText.startsWith('play_track:') ||
        commandText.startsWith('group_menu_')) {
      logger.info(`Group-only command/action ${commandText} executed in group ${ctx.chat.id}`);
      return next();
    }

    // Skip middleware for specific group management events
    if (ctx.message?.new_chat_members || ctx.message?.left_chat_member) {
      logger.info(`Group management event detected, allowing normal group response`);
      return next();
    }

    // Add a flag to allow group responses when needed
    ctx.allowGroupResponse = () => {
      ctx._allowGroupResponse = true;
    };

    // Store original methods (after auto-delete middleware has modified them)
    const originalReply = ctx.reply.bind(ctx);
    const originalEditMessageText = ctx.editMessageText.bind(ctx);
    const originalAnswerCbQuery = ctx.answerCbQuery.bind(ctx);

    const userId = ctx.from.id;
    const lang = ctx.session?.language || "en";

    // Override ctx.reply to send to private chat
    ctx.reply = async (text, extra = {}) => {
      // If group response is explicitly allowed, use original reply
      if (ctx._allowGroupResponse) {
        return originalReply(text, extra);
      }

      try {
        // Send to private chat instead
        await ctx.telegram.sendMessage(userId, text, extra);
        
        // Send a brief notification in the group (only for commands, not automatic responses)
        if (ctx.message?.text?.startsWith('/') || ctx.callbackQuery) {
          // Use ctx.telegram.sendMessage to ensure auto-delete middleware handles it
          await ctx.telegram.sendMessage(
            ctx.chat.id,
            lang === "es" 
              ? "✉️ Te he enviado la respuesta por mensaje privado." 
              : "✉️ I've sent you the response via private message.",
            { 
              parse_mode: "Markdown",
              reply_to_message_id: ctx.message?.message_id 
            }
          );
        }
      } catch (error) {
        // Handle various private message failures
        const errorDesc = error.description || '';
        const isPrivateMessageFail = 
          errorDesc.includes("bot can't initiate conversation") ||
          errorDesc.includes("bots can't send messages to bots") ||
          errorDesc.includes("Not Found") ||
          error.code === 403 ||
          error.code === 404;

        if (isPrivateMessageFail) {
          logger.warn(`Private message failed for user ${userId}: ${errorDesc}`);
          // Use user's first name to avoid Markdown parsing issues with @ and underscores
          const userName = ctx.from.first_name || ctx.from.username || "User";
          const safeUserName = escapeMdV2(String(userName));
          await ctx.telegram.sendMessage(
            ctx.chat.id,
            lang === "es"
              ? `⚠️ ${safeUserName}, necesitas iniciar una conversación conmigo primero.\n\n👆 Haz clic en mi nombre y presiona "Iniciar" para recibir respuestas privadas.`
              : `⚠️ ${safeUserName}, you need to start a conversation with me first.\n\n👆 Click on my name and press "Start" to receive private responses.`,
            {
              reply_to_message_id: ctx.message?.message_id,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: lang === "es" ? "🤖 Iniciar Bot" : "🤖 Start Bot",
                      url: `https://t.me/PNPtvbot?start=group_redirect`
                    }
                  ]
                ]
              }
            }
          );
        } else {
          logger.error("Unexpected error sending private message:", error);
          // Fallback: send in group with warning (using ctx.telegram.sendMessage for auto-delete)
          await ctx.telegram.sendMessage(
            ctx.chat.id,
            `🔒 ${lang === "es" ? "Respuesta privada no disponible" : "Private response unavailable"}\n\n${text}`,
            extra
          );
        }
      }
    };

    // Override editMessageText for callback queries
    ctx.editMessageText = async (text, extra = {}) => {
      if (ctx.callbackQuery) {
        try {
          // Send new message to private chat instead of editing
          await ctx.telegram.sendMessage(userId, text, extra);
          
          // Acknowledge callback in group
          await originalAnswerCbQuery(
            lang === "es" ? "Respuesta enviada por privado" : "Response sent privately"
          );
        } catch (error) {
          const errorDesc = error.description || '';
          const isPrivateMessageFail = 
            errorDesc.includes("bot can't initiate conversation") ||
            errorDesc.includes("bots can't send messages to bots") ||
            errorDesc.includes("Not Found") ||
            error.code === 403 ||
            error.code === 404;

          if (isPrivateMessageFail) {
            logger.warn(`Private message failed for callback from user ${userId}: ${errorDesc}`);
            // User hasn't started bot - show inline button to start
            await originalAnswerCbQuery(
              lang === "es" 
                ? "Inicia el bot primero para recibir respuestas privadas" 
                : "Start the bot first to receive private responses",
              { show_alert: true }
            );
          } else {
            logger.error("Unexpected error sending private message for callback:", error);
            // Fallback to group response
            return originalEditMessageText(text, extra);
          }
        }
      } else {
        return originalEditMessageText(text, extra);
      }
    };

    // Enhanced answerCbQuery
    ctx.answerCbQuery = async (text = "", extra = {}) => {
      const defaultText = text || (
        lang === "es" 
          ? "Procesando..." 
          : "Processing..."
      );
      return originalAnswerCbQuery(defaultText, extra);
    };

    logger.info(`Group interaction detected from user ${userId} in chat ${ctx.chat.id}, redirecting to private`);
    
    return next();
  };
}

module.exports = privateResponseMiddleware;