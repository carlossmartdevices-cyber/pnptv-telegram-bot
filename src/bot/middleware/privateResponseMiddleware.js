const logger = require("../../utils/logger");
const { t } = require("../../utils/i18n");

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
    const groupOnlyCommands = ['/status', '/refresh', '/info'];
    const commandText = ctx.message?.text || ctx.callbackQuery?.data || '';
    
    // Allow group management functions to work normally
    if (groupOnlyCommands.some(cmd => commandText.startsWith(cmd))) {
      logger.info(`Group-only command ${commandText} executed in group ${ctx.chat.id}`);
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

    // Store original methods
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
          await originalReply(
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
        // If private message fails (user hasn't started bot), inform in group
        if (error.description && error.description.includes("bot can't initiate conversation")) {
          await originalReply(
            lang === "es"
              ? `⚠️ @${ctx.from.username || ctx.from.first_name}, necesitas iniciar una conversación conmigo primero.\n\n👆 Haz clic en mi nombre y presiona "Iniciar" para recibir respuestas privadas.`
              : `⚠️ @${ctx.from.username || ctx.from.first_name}, you need to start a conversation with me first.\n\n👆 Click on my name and press "Start" to receive private responses.`,
            {
              parse_mode: "Markdown",
              reply_to_message_id: ctx.message?.message_id,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: lang === "es" ? "🤖 Iniciar Bot" : "🤖 Start Bot",
                      url: `https://t.me/${ctx.botInfo.username}?start=group_redirect`
                    }
                  ]
                ]
              }
            }
          );
        } else {
          logger.error("Error sending private message:", error);
          // Fallback: send in group with warning
          await originalReply(
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
          if (error.description && error.description.includes("bot can't initiate conversation")) {
            // User hasn't started bot - show inline button to start
            await originalAnswerCbQuery(
              lang === "es" 
                ? "Inicia el bot primero para recibir respuestas privadas" 
                : "Start the bot first to receive private responses",
              { show_alert: true }
            );
          } else {
            logger.error("Error sending private message for callback:", error);
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