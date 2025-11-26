import { launchBot } from '../bot/index.js';
import { logger } from '../config/logger.js';
import { PLANS } from '../constants/plans.js';

export const notifyPaymentApproved = async ({ chatId, sku, currentPeriodEnd }) => {
  if (!chatId) {
    return;
  }
  try {
    const bot = launchBot();
    const plan = PLANS[sku];
    const formattedDate = currentPeriodEnd.toLocaleDateString('es-CO');
    await bot.telegram.sendMessage(
      chatId,
      `✅ Pago aprobado. Tu plan ${plan?.label || sku} está activo hasta ${formattedDate}. ¡Disfruta PNPtv!`
    );
  } catch (error) {
    logger.error('Failed to send Telegram notification', error);
  }
};
