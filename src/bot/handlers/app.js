/**
 * Mini App Handler
 * Opens the PNPtv Community Web App
 */

const logger = require('../../utils/logger');

module.exports = async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const lang = ctx.session?.language || 'en';
        const webAppUrl = process.env.WEB_APP_URL || process.env.WEBAPP_URL;

        logger.info(`User ${userId} requested mini app`);

        if (webAppUrl && webAppUrl.startsWith('https://')) {
            await ctx.reply(
                lang === 'es'
                    ? '🌐 *¡Bienvenido a PNPtv Community!*\n\n✨ Accede a todas las funciones:\n\n• 📱 Feed de la Comunidad\n• 👤 Perfil personalizado\n• 🤖 Asistente AI Cristina\n• 💬 Chat y contacto\n• ⭐ Panel de artistas\n\nToca el botón abajo para comenzar!'
                    : '🌐 *Welcome to PNPtv Community!*\n\n✨ Access all features:\n\n• 📱 Community Feed\n• 👤 Personalized Profile\n• 🤖 AI Assistant Cristina\n• 💬 Chat & Contact\n• ⭐ Performer Panel\n\nTap the button below to get started!',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: lang === 'es' ? '🚀 Abrir App' : '🚀 Open App',
                                    web_app: { url: webAppUrl }
                                }
                            ]
                        ]
                    }
                }
            );
        } else {
            await ctx.reply(
                lang === 'es'
                    ? '💡 *Mini App en Desarrollo!*\n\n🌐 Disponible pronto en Telegram\n\n📱 Por ahora, accede en:\n`http://localhost:3000`'
                    : '💡 *Mini App in Development!*\n\n🌐 Available soon in Telegram\n\n📱 For now, access at:\n`http://localhost:3000`',
                { parse_mode: 'Markdown' }
            );
        }
    } catch (error) {
        logger.error('Error in app handler:', error);
        await ctx.reply('Error opening app. Please try again later.');
    }
};
