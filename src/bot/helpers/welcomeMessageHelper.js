const logger = require("../../utils/logger");
const { t } = require("../../utils/i18n");

/**
 * Generate welcome message for new group member
 * @param {Object} member - Telegram member object
 * @param {String} tier - User subscription tier
 * @param {String} userLanguage - User's preferred language (en or es)
 * @returns {String} Formatted welcome message
 */
function generateWelcomeMessage(member, tier, userLanguage = 'en') {
  const username = member.username || member.first_name;

  if (tier === 'Free') {
    // Free member welcome
    return userLanguage === 'es'
      ? `👋 ¡Bienvenido @${username}!\n\n🎉 ¡Bienvenido a la Comunidad PNPtv!\n\n🆓 **Miembro Gratuito**\n• Solo mensajes de texto\n• Acceso a contenido gratuito\n• ¡Únete a la conversación!\n\n💎 ¡Mejora a premium para fotos, videos y contenido exclusivo!\n\n📌 Consulta nuestra guía: https://pnptv.app/guide`
      : `👋 Welcome @${username}!\n\n🎉 Welcome to PNPtv Community!\n\n🆓 **Free Member**\n• Text messages only\n• Access to free content\n• Join the conversation!\n\n💎 Upgrade to premium for photos, videos, and exclusive content!\n\n📌 Check out our guide: https://pnptv.app/guide`;
  } else {
    // Premium member welcome
    return userLanguage === 'es'
      ? `👋 ¡Bienvenido @${username}!\n\n🎉 ¡Bienvenido a la Comunidad PNPtv!\n\n💎 **Miembro ${tier}**\n• Acceso completo a medios\n• Contenido premium desbloqueado\n• Características exclusivas\n• Estado: Activo ✅\n\n🔥 ¡Todo listo — ¡que disfrutes!\n\n📌 Consulta nuestra guía: https://pnptv.app/guide`
      : `👋 Welcome @${username}!\n\n🎉 Welcome to PNPtv Community!\n\n💎 **${tier} Member**\n• Full media access\n• Premium content unlocked\n• Exclusive features\n• Status: Active ✅\n\n🔥 You're all set — enjoy the ride!\n\n📌 Check out our guide: https://pnptv.app/guide`;
  }
}

module.exports = {
  generateWelcomeMessage
};
