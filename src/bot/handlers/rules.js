const logger = require('../../utils/logger');

/**
 * Rules Handler
 * Displays community rules and guidelines for different features
 */

/**
 * Show all rules
 */
async function handleRules(ctx) {
  try {
    const lang = ctx.session?.language || 'en';

    const message = lang === 'es'
      ? `📋 *Reglas de la Comunidad PNPtv*\n\n` +
        `Bienvenido a nuestra comunidad. Por favor, lee y sigue estas reglas para mantener un ambiente positivo y seguro para todos.\n\n` +
        `Selecciona una sección para ver las reglas:`
      : `📋 *PNPtv Community Rules*\n\n` +
        `Welcome to our community. Please read and follow these rules to maintain a positive and safe environment for everyone.\n\n` +
        `Select a section to view the rules:`;

    const keyboard = [
      [
        {
          text: lang === 'es' ? '👥 Reglas del Grupo' : '👥 Group Rules',
          callback_data: 'rules_group'
        }
      ],
      [
        {
          text: lang === 'es' ? '📍 Reglas del Mapa' : '📍 Map Rules',
          callback_data: 'rules_map'
        }
      ],
      [
        {
          text: lang === 'es' ? '📹 Reglas de Zoom' : '📹 Zoom Rules',
          callback_data: 'rules_zoom'
        }
      ],
      [
        {
          text: lang === 'es' ? '📚 Reglas de la Biblioteca' : '📚 Library Rules',
          callback_data: 'rules_library'
        }
      ],
      [
        {
          text: lang === 'es' ? '🔙 Cerrar' : '🔙 Close',
          callback_data: 'close_rules'
        }
      ]
    ];

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });

    logger.info(`User ${ctx.from.id} viewed rules menu`);
  } catch (error) {
    logger.error('Error showing rules:', error);
    await ctx.reply('❌ Error loading rules. Please try again.');
  }
}

/**
 * Show group rules
 */
async function handleGroupRules(ctx) {
  try {
    await ctx.answerCbQuery();
    const lang = ctx.session?.language || 'en';

    const message = lang === 'es'
      ? `👥 *Reglas del Grupo*\n\n` +
        `Sé respetuoso y sigue todas las pautas de la comunidad.\n\n` +
        `Solo comparte contenido apropiado (sin discurso de odio, spam o material ilegal).\n\n` +
        `Usa español o inglés para asegurar que todos puedan participar.\n\n` +
        `Respeta la privacidad y seguridad de todos — no compartas información personal sin consentimiento.\n\n` +
        `Las violaciones siguen un sistema de castigo progresivo:\n` +
        `⚠️ Advertencia → Silenciar → Expulsar → Banear\n\n` +
        `🔗 *IMPORTANTE:* Está prohibido compartir enlaces. Si deseas promover tu grupo o canal, envía un correo a support@pnptv.app. ¡Creemos en apoyarnos mutuamente, pero hagámoslo de manera segura!\n\n` +
        `🚨 *ADVERTENCIA:* Si hay alguna preocupación sobre alguien haciendo actividades ilegales en el grupo, serán expulsados inmediatamente sin previo aviso. En caso de duda, se te puede pedir que confirmes que eres adulto usando herramientas de IA o solicitando tu identificación.`
      : `👥 *Group Rules*\n\n` +
        `Be respectful and follow all community guidelines.\n\n` +
        `Only share appropriate content (no hate speech, spam, or illegal material).\n\n` +
        `Use English or Spanish to ensure everyone can participate.\n\n` +
        `Respect each other's privacy and safety — no sharing of personal info without consent.\n\n` +
        `Violations follow a progressive punishment system:\n` +
        `⚠️ Warning → Mute → Kick → Ban\n\n` +
        `🔗 *IMPORTANT:* It is forbidden to share links. If you want to promote your group or channel, please send an email to support@pnptv.app. We believe in supporting each other but let's do it safely!\n\n` +
        `🚨 *WARNING:* If there is any concern about someone doing illegal activities in the group, they will be kicked out immediately without notice. In case of doubt, you might be asked to confirm you are an adult using AI tools or by providing ID.`;

    const keyboard = [[
      {
        text: lang === 'es' ? '« Volver al Menú' : '« Back to Menu',
        callback_data: 'rules_menu'
      }
    ]];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (error) {
    logger.error('Error showing group rules:', error);
  }
}

/**
 * Show map rules
 */
async function handleMapRules(ctx) {
  try {
    await ctx.answerCbQuery();
    const lang = ctx.session?.language || 'en';

    const message = lang === 'es'
      ? `📍 *Reglas del Mapa*\n\n` +
        `Mantén tu información de ubicación precisa para un mejor emparejamiento cercano.\n\n` +
        `Siempre sigue las pautas de privacidad y seguridad al compartir tu ubicación.\n\n` +
        `Usa la función Cercanos de manera responsable — sin acoso ni mensajes no solicitados.\n\n` +
        `Elige tu radio de búsqueda: 5 km, 10 km, 25 km o 50 km.\n\n` +
        `Sigue las recomendaciones de seguridad para reuniones: reúnete en lugares públicos y usa contactos de confianza.`
      : `📍 *Map Rules*\n\n` +
        `Keep your location information accurate for better nearby matching.\n\n` +
        `Always follow privacy and safety guidelines when sharing your location.\n\n` +
        `Use the Nearby feature responsibly — no harassment or unsolicited messages.\n\n` +
        `Choose your search radius: 5 km, 10 km, 25 km, or 50 km.\n\n` +
        `Follow meetup safety recommendations: meet in public places and use trusted contacts.`;

    const keyboard = [[
      {
        text: lang === 'es' ? '« Volver al Menú' : '« Back to Menu',
        callback_data: 'rules_menu'
      }
    ]];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (error) {
    logger.error('Error showing map rules:', error);
  }
}

/**
 * Show Zoom rules
 */
async function handleZoomRules(ctx) {
  try {
    await ctx.answerCbQuery();
    const lang = ctx.session?.language || 'en';

    const message = lang === 'es'
      ? `📹 *Reglas de Zoom*\n\n` +
        `Solo los miembros Premium pueden organizar videollamadas.\n\n` +
        `Debes programar las llamadas con al menos 15 minutos de anticipación usando /schedulecall.\n\n` +
        `Practica buena etiqueta en videollamadas — sé puntual, respetuoso y vístete apropiadamente a menos que se acuerde lo contrario.\n\n` +
        `Los anfitriones son responsables de moderar el comportamiento y reportar problemas.\n\n` +
        `Los participantes deben seguir todos los estándares de la comunidad.\n\n` +
        `El contenido de las transmisiones en vivo debe cumplir con las leyes locales y las políticas de la plataforma.\n\n` +
        `Las violaciones pueden resultar en suspensión o baneo permanente.\n\n` +
        `⚠️ *Importante:* Santino, Lex o cualquier otro artista NO estarán presentes a menos que se confirme explícitamente.`
      : `📹 *Zoom Rules*\n\n` +
        `Only Premium Members can host video calls.\n\n` +
        `You must schedule calls at least 15 minutes in advance using /schedulecall.\n\n` +
        `Practice good video call etiquette — be punctual, respectful, and clothed unless otherwise agreed.\n\n` +
        `Hosts are responsible for moderating behavior and reporting issues.\n\n` +
        `Participants must follow all community standards.\n\n` +
        `Live stream content must comply with local laws and platform policies.\n\n` +
        `Violations may result in suspension or permanent ban.\n\n` +
        `⚠️ *Important:* Santino, Lex or any other performers will NOT be in attendance unless explicitly confirmed.`;

    const keyboard = [[
      {
        text: lang === 'es' ? '« Volver al Menú' : '« Back to Menu',
        callback_data: 'rules_menu'
      }
    ]];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (error) {
    logger.error('Error showing Zoom rules:', error);
  }
}

/**
 * Show library rules
 */
async function handleLibraryRules(ctx) {
  try {
    await ctx.answerCbQuery();
    const lang = ctx.session?.language || 'en';

    const message = lang === 'es'
      ? `📚 *Reglas de la Biblioteca*\n\n` +
        `La Biblioteca está abierta para todos los miembros.\n\n` +
        `Al agregar música, incluye títulos correctos y nombres de artistas.\n\n` +
        `No subas material protegido por derechos de autor, contenido de odio o material explícito sin consentimiento.\n\n` +
        `Los miembros Premium pueden crear y compartir listas de reproducción.\n\n` +
        `Sigue las pautas de reproducción y contenido para mantener un funcionamiento fluido.\n\n` +
        `El contenido se cura regularmente para mantener una experiencia de alta calidad.\n\n` +
        `⚠️ *Importante:* Ninguna de la música nos pertenece. Por favor apoya a los DJs locales que subieron la música a SoundCloud.`
      : `📚 *Library Rules*\n\n` +
        `The Library is open to all members.\n\n` +
        `When adding music, include correct titles and artist names.\n\n` +
        `Do not upload copyrighted, hateful, or explicit non-consensual material.\n\n` +
        `Premium Members can create and share playlists.\n\n` +
        `Follow playback and content guidelines to maintain smooth operation.\n\n` +
        `Content is curated regularly to keep the experience high-quality.\n\n` +
        `⚠️ *Important:* None of the music belongs to us. Please support the local DJs who uploaded the music to SoundCloud.`;

    const keyboard = [[
      {
        text: lang === 'es' ? '« Volver al Menú' : '« Back to Menu',
        callback_data: 'rules_menu'
      }
    ]];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (error) {
    logger.error('Error showing library rules:', error);
  }
}

/**
 * Handle back to rules menu
 */
async function handleBackToRulesMenu(ctx) {
  try {
    await ctx.answerCbQuery();
    const lang = ctx.session?.language || 'en';

    const message = lang === 'es'
      ? `📋 *Reglas de la Comunidad PNPtv*\n\n` +
        `Bienvenido a nuestra comunidad. Por favor, lee y sigue estas reglas para mantener un ambiente positivo y seguro para todos.\n\n` +
        `Selecciona una sección para ver las reglas:`
      : `📋 *PNPtv Community Rules*\n\n` +
        `Welcome to our community. Please read and follow these rules to maintain a positive and safe environment for everyone.\n\n` +
        `Select a section to view the rules:`;

    const keyboard = [
      [
        {
          text: lang === 'es' ? '👥 Reglas del Grupo' : '👥 Group Rules',
          callback_data: 'rules_group'
        }
      ],
      [
        {
          text: lang === 'es' ? '📍 Reglas del Mapa' : '📍 Map Rules',
          callback_data: 'rules_map'
        }
      ],
      [
        {
          text: lang === 'es' ? '📹 Reglas de Zoom' : '📹 Zoom Rules',
          callback_data: 'rules_zoom'
        }
      ],
      [
        {
          text: lang === 'es' ? '📚 Reglas de la Biblioteca' : '📚 Library Rules',
          callback_data: 'rules_library'
        }
      ],
      [
        {
          text: lang === 'es' ? '🔙 Cerrar' : '🔙 Close',
          callback_data: 'close_rules'
        }
      ]
    ];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (error) {
    logger.error('Error going back to rules menu:', error);
  }
}

/**
 * Close rules
 */
async function handleCloseRules(ctx) {
  try {
    await ctx.answerCbQuery('Rules closed');
    await ctx.deleteMessage();
  } catch (error) {
    logger.error('Error closing rules:', error);
  }
}

module.exports = {
  handleRules,
  handleGroupRules,
  handleMapRules,
  handleZoomRules,
  handleLibraryRules,
  handleBackToRulesMenu,
  handleCloseRules
};
