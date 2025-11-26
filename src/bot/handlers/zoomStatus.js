const logger = require("../../utils/logger");
const { t } = require("../../utils/i18n");
const { getUserPermissions } = require("../helpers/groupManagement");
const zoomUsageService = require("../../services/zoomUsageService");

/**
 * Handle /zoomstatus command - Show current zoom quota usage
 */
async function handleZoomStatus(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const lang = ctx.session?.language || 'en';
    
    // Get user permissions
    const { tier } = await getUserPermissions(userId);
    
    // Get zoom usage
    const usage = await zoomUsageService.getZoomUsage(userId);
    
    // Format reset date
    const resetDate = usage.resetDate.toLocaleDateString(
      lang === 'es' ? 'es-CO' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );

    // Calculate percentage
    const percentage = Math.round((usage.used / usage.quota) * 100);
    
    // Create progress bar
    let progressBar = '';
    const barLength = 10;
    const filledLength = Math.round((usage.used / usage.quota) * barLength);
    for (let i = 0; i < barLength; i++) {
      progressBar += i < filledLength ? '█' : '░';
    }

    // Build message
    let message = lang === 'es'
      ? `📊 *Estado de Salas Zoom*\n\n`
      : `📊 *Zoom Room Status*\n\n`;

    message += lang === 'es'
      ? `👤 *Tu Información:*\n`
      : `👤 *Your Information:*\n`;

    message += `• ${lang === 'es' ? 'Nivel' : 'Tier'}: ${tier}\n`;
    message += `• ${lang === 'es' ? 'Cuota Mensual' : 'Monthly Quota'}: ${usage.quota} ${lang === 'es' ? 'salas' : 'rooms'}\n\n`;

    message += lang === 'es'
      ? `📈 *Uso Este Mes:*\n`
      : `📈 *This Month's Usage:*\n`;

    message += `${progressBar} ${usage.used}/${usage.quota} (${percentage}%)\n\n`;

    message += lang === 'es'
      ? `✅ *Disponibles:* ${usage.remaining} ${usage.remaining === 1 ? 'sala' : 'salas'}\n`
      : `✅ *Available:* ${usage.remaining} ${usage.remaining === 1 ? 'room' : 'rooms'}\n`;

    message += lang === 'es'
      ? `🔄 *Se Reinicia:* ${resetDate}\n\n`
      : `🔄 *Resets On:* ${resetDate}\n\n`;

    // Show tier info
    message += lang === 'es'
      ? `💡 *Cuotas por Nivel:*\n`
      : `💡 *Quotas by Tier:*\n`;

    message += lang === 'es'
      ? `🆓 Gratuito: 1 sala/mes\n` +
        `⏱️ Semana de Prueba: 1 sala/mes\n` +
        `📅 Miembro Mensual: 3 salas/mes\n` +
        `💎 Crystal/Diamond: 5 salas/mes\n\n`
      : `🆓 Free: 1 room/month\n` +
        `⏱️ Trial Week: 1 room/month\n` +
        `📅 Monthly Member: 3 rooms/month\n` +
        `💎 Crystal/Diamond: 5 rooms/month\n\n`;

    // Show commands
    message += lang === 'es'
      ? `📋 *Comandos Disponibles:*\n` +
        `/menu - ${lang === 'es' ? 'Crear sala instantáneamente' : 'Create room instantly'}\n` +
        `/schedulecall - ${lang === 'es' ? 'Programar videollamada' : 'Schedule video call'}\n` +
        `/schedulestream - ${lang === 'es' ? 'Programar transmisión' : 'Schedule stream'}`
      : `📋 *Available Commands:*\n` +
        `/menu - Create room instantly\n` +
        `/schedulecall - Schedule video call\n` +
        `/schedulestream - Schedule stream`;

    await ctx.reply(message, { parse_mode: 'Markdown' });

    logger.info(`[ZoomStatus] User ${userId} checked zoom quota`);
  } catch (error) {
    logger.error('Error in handleZoomStatus:', error);
    const lang = ctx.session?.language || 'en';
    await ctx.reply(
      lang === 'es'
        ? '❌ Error al obtener estado de salas. Por favor intenta de nuevo.'
        : '❌ Error checking zoom status. Please try again.',
      { parse_mode: 'Markdown' }
    );
  }
}

module.exports = { handleZoomStatus };
