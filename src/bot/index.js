import axios from 'axios';
import { Telegraf, Markup } from 'telegraf';
import LocalSession from 'telegraf-session-local';
import { v5 as uuidv5 } from 'uuid';
import { env } from '../config/env.js';
import { getFxRate } from '../services/fxService.js';
import { PLANS, ADDONS } from '../constants/plans.js';
import { logger } from '../config/logger.js';

const TELEGRAM_NAMESPACE = '0f71f300-7d33-4dbe-9dd8-4f4d51234567';
let botInstance;
const apiClient = axios.create({
  baseURL: env.app.apiBaseUrl,
  timeout: 10_000
});

const formatPlan = (plan, fxRate) => {
  const cop = Math.round(plan.usdPrice * fxRate);
  return `*${plan.label}*\nUSD $${plan.usdPrice.toFixed(2)} ≈ COP $${cop.toLocaleString('es-CO')}\nBeneficios: ${plan.benefits
    .map((b) => `_${b.replace(/-/g, ' ')}_`)
    .join(', ')}`;
};

const formatAddon = (addon, fxRate) => {
  const cop = Math.round(addon.usdPrice * fxRate);
  return `• ${addon.label} — USD $${addon.usdPrice.toFixed(2)} (≈ COP $${cop.toLocaleString('es-CO')})`;
};

const buildPlanKeyboard = () =>
  Markup.inlineKeyboard([
    [Markup.button.callback('Silver 30d', 'subscribe:silver_30d')],
    [Markup.button.callback('Golden 30d', 'subscribe:golden_30d')],
    [Markup.button.url('Abrir Mini App', env.telegram.webAppUrl)]
  ]);

const buildAddonKeyboard = () =>
  Markup.inlineKeyboard([
    [Markup.button.callback('Añadir Plus Pack', 'addon:plus_pack')],
    [Markup.button.callback('Añadir Boost', 'addon:boost')],
    [Markup.button.callback('Continuar sin extras', 'checkout:confirm')]
  ]);

const ensureBot = () => {
  if (botInstance) {
    return botInstance;
  }

  const bot = new Telegraf(env.telegram.token);
  bot.use(new LocalSession({ database: 'sessions.json' }).middleware());

  bot.start(async (ctx) => {
    const fxRate = await getFxRate();
    const plansText = Object.values(PLANS)
      .map((plan) => formatPlan(plan, fxRate))
      .join('\n\n');

    await ctx.replyWithMarkdown(
      `Hola ${ctx.from.first_name || 'PNPlover'}! 💖\n` +
        'PNPtv fusiona microblogging en tiempo real con geolocalización. ' +
        'Elige un plan para desbloquear beneficios exclusivos.\n\n' +
        plansText,
      buildPlanKeyboard()
    );
  });

  bot.command('plans', async (ctx) => {
    const fxRate = await getFxRate();
    const plans = Object.values(PLANS)
      .map((plan) => formatPlan(plan, fxRate))
      .join('\n\n');
    await ctx.replyWithMarkdown(`Planes disponibles:\n\n${plans}`);
  });

  bot.command('share', async (ctx) => {
    await ctx.reply(
      'Invita a 10 amigxs y obtén 1 mes Golden gratis. Comparte tu enlace personal en grupos o stories.',
      Markup.inlineKeyboard([
        [Markup.button.url('Compartir en stories', `${env.app.baseUrl}/share?user=${ctx.from.id}`)],
        [Markup.button.url('Copiar enlace de invitación', `${env.app.baseUrl}/invite/${ctx.from.id}`)]
      ])
    );
  });

  bot.action(/subscribe:(.+)/, async (ctx) => {
    const [, sku] = ctx.match;
    ctx.session.checkout = { sku, addons: [] };
    const fxRate = await getFxRate();
    const addonText = Object.values(ADDONS)
      .map((addon) => formatAddon(addon, fxRate))
      .join('\n');
    await ctx.editMessageText(
      `Genial, seleccionaste ${PLANS[sku].label}. ¿Deseas añadir extras?\n\n${addonText}`,
      buildAddonKeyboard()
    );
  });

  bot.action(/addon:(.+)/, async (ctx) => {
    const [, addonSku] = ctx.match;
    ctx.session.checkout = ctx.session.checkout || { addons: [] };
    if (!ctx.session.checkout.addons.includes(addonSku)) {
      ctx.session.checkout.addons.push(addonSku);
    }
    await ctx.answerCbQuery('Addon agregado ✅');
  });

  bot.action('checkout:confirm', async (ctx) => {
    const checkout = ctx.session.checkout;
    if (!checkout?.sku) {
      await ctx.answerCbQuery('Selecciona un plan primero', { show_alert: true });
      return;
    }

    const userUuid = uuidv5(String(ctx.from.id), TELEGRAM_NAMESPACE);
    try {
      const response = await apiClient.post('/api/checkout', {
        sku: checkout.sku,
        addons: checkout.addons,
        origin: 'telegram-miniapp',
        userId: userUuid,
        customerName: `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim() || undefined,
        telegramChatId: ctx.chat?.id ? String(ctx.chat.id) : undefined
      });
      await ctx.editMessageText(
        'Listo 💸. Toca el botón para pagar con Bold.co y vuelve a Telegram para activar tus beneficios.',
        Markup.inlineKeyboard([[Markup.button.url('Pagar con Bold', response.data.paymentUrl)]])
      );
    } catch (error) {
      logger.error('Failed to create checkout', error.response?.data || error.message);
      await ctx.reply('No pudimos iniciar el pago. Intenta de nuevo en unos minutos.');
    }
  });

  bot.catch((err, ctx) => {
    logger.error('Telegraf error', err);
    ctx.reply('Ups! Algo salió mal. Nuestro equipo ya fue notificado.');
  });

  bot.launch().then(() => logger.info('Telegram bot launched'));
  botInstance = bot;
  return botInstance;
};

export const launchBot = () => ensureBot();

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  launchBot();
}
