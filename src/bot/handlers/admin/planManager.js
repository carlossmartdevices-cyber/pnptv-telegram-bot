const { Markup } = require('telegraf');
const { isAdmin } = require('../../../config/admin');
const logger = require('../../../utils/logger');
const planService = require('../../../services/planService');

const PLAN_CREATION_STEPS = [
  {
    key: 'name',
    prompt: 'Enter the internal plan name (e.g. PNPtv Silver):',
    transform: (value) => value.trim(),
    validate: (value) => value.length >= 3,
    errorMessage: 'Name must be at least 3 characters.'
  },
  {
    key: 'displayName',
    prompt: 'Enter the display name shown to users (or type "skip"): ',
    optional: true,
    transform: (value) => value.trim(),
  },
  {
    key: 'tier',
    prompt: 'Enter the tier (e.g. Basic, Premium, VIP):',
    transform: (value) => value.trim(),
    validate: (value) => value.length >= 3,
    errorMessage: 'Tier must be provided (e.g. Premium).'
  },
  {
    key: 'currency',
    prompt: 'Enter the currency (USD or COP):',
    transform: (value) => value.trim().toUpperCase(),
    validate: (value) => ['USD', 'COP'].includes(value),
    errorMessage: 'Currency must be either USD or COP.'
  },
  {
    key: 'price',
    prompt: 'Enter the price (in the currency you selected):',
    transform: (value) => parseFloat(value.replace(/[^0-9.]/g, '')),
    validate: (value) => Number.isFinite(value) && value >= 0,
    errorMessage: 'Please enter a valid number for the price.'
  },
  {
    key: 'priceInCOP',
    prompt: 'Enter the price in COP (or type "skip" to auto-calculate from USD):',
    optional: true,
    transform: (value) => {
      const trimmed = value.trim();
      if (!trimmed || trimmed.toLowerCase() === 'skip') {
        return undefined;
      }
      const parsed = parseInt(trimmed.replace(/[^0-9]/g, ''), 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error('Please enter a valid numeric COP amount or "skip".');
      }
      return parsed;
    },
  },
  {
    key: 'duration',
    prompt: 'Enter the duration in days:',
    transform: (value) => parseInt(value, 10),
    validate: (value) => Number.isInteger(value) && value > 0,
    errorMessage: 'Duration must be a positive integer.'
  },
  {
    key: 'paymentMethod',
    prompt: 'Choose payment method (epayco, nequi, or daimo):',
    transform: (value) => value.trim().toLowerCase(),
    validate: (value) => ['epayco', 'nequi', 'daimo'].includes(value),
    errorMessage: 'Payment method must be either "epayco", "nequi", or "daimo".'
  },
  {
    key: 'paymentLink',
    prompt: 'Enter the Nequi Negocios payment link:',
    optional: true,
    conditional: (data) => data.paymentMethod === 'nequi',
    transform: (value) => value.trim(),
    validate: (value) => value.length > 0,
    errorMessage: 'Payment link is required for Nequi payment method.'
  },
  {
    key: 'daimoAppId',
    prompt: 'Enter your Daimo App ID (or type "skip" to use default from .env):',
    optional: true,
    conditional: (data) => data.paymentMethod === 'daimo',
    transform: (value) => {
      const trimmed = value.trim();
      if (!trimmed || trimmed.toLowerCase() === 'skip') {
        return undefined;
      }
      return trimmed;
    },
  },
  {
    key: 'description',
    prompt: 'Enter a short description (or type "skip"): ',
    optional: true,
    transform: (value) => value.trim(),
  },
  {
    key: 'features',
    prompt: 'Enter the plan features, one per line. Send all features in a single message.',
    transform: (value) => value.split(/\r?\n+/).map((item) => item.trim()).filter(Boolean),
    validate: (value) => Array.isArray(value) && value.length > 0,
    errorMessage: 'Please provide at least one feature.'
  },
  {
    key: 'icon',
    prompt: 'Enter an emoji/icon for the plan (or type "skip"): ',
    optional: true,
    transform: (value) => value.trim(),
  },
  {
    key: 'cryptoBonus',
    prompt: 'Enter a crypto bonus description (or type "skip"): ',
    optional: true,
    transform: (value) => value.trim(),
  },
  {
    key: 'recommended',
    prompt: 'Should this plan be recommended? (yes/no, default no):',
    optional: true,
    transform: (value) => {
      const normalized = value.trim().toLowerCase();
      if (!normalized || normalized === 'skip') {
        return false;
      }
      if (['yes', 'y', 'true', '1'].includes(normalized)) {
        return true;
      }
      if (['no', 'n', 'false', '0'].includes(normalized)) {
        return false;
      }
      throw new Error('Please reply with yes or no.');
    },
  },
];

const PLAN_EDIT_FIELDS = {
  name: {
    label: 'Plan name',
    transform: (value) => value.trim(),
    validate: (value) => value.length >= 3,
    prepare: (value) => ({ name: value }),
    errorMessage: 'Name must be at least 3 characters.'
  },
  displayName: {
    label: 'Display name',
    transform: (value) => value.trim(),
    validate: (value) => value.length >= 1,
    prepare: (value) => ({ displayName: value }),
    errorMessage: 'Display name cannot be empty.'
  },
  price: {
    label: 'Price (USD)',
    transform: (value) => parseFloat(value.replace(',', '.')),
    validate: (value) => Number.isFinite(value) && value >= 0,
    prepare: (value) => ({ price: value }),
    errorMessage: 'Provide a valid non-negative number.'
  },
  priceInCOP: {
    label: 'Price (COP)',
    optional: true,
    transform: (value) => {
      const trimmed = value.trim();
      if (!trimmed || trimmed.toLowerCase() === 'skip') {
        return undefined;
      }
      const parsed = parseInt(trimmed.replace(/[^0-9.]/g, ''), 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error('Please enter a numeric COP amount or "skip".');
      }
      return parsed;
    },
    validate: () => true,
    prepare: (value) => ({ priceInCOP: value }),
  },
  duration: {
    label: 'Duration (days)',
    transform: (value) => parseInt(value, 10),
    validate: (value) => Number.isInteger(value) && value > 0,
    prepare: (value) => ({ duration: value, durationDays: value }),
    errorMessage: 'Duration must be a positive integer.'
  },
  tier: {
    label: 'Tier',
    transform: (value) => value.trim(),
    validate: (value) => value.length >= 3,
    prepare: (value) => ({ tier: value }),
    errorMessage: 'Tier must be at least 3 characters.'
  },
  description: {
    label: 'Description',
    optional: true,
    transform: (value) => value.trim(),
    validate: () => true,
    prepare: (value) => ({ description: value || '' }),
  },
  features: {
    label: 'Features',
    transform: (value) => value.split(/\r?\n+/).map((item) => item.trim()).filter(Boolean),
    validate: (value) => Array.isArray(value) && value.length > 0,
    prepare: (value) => ({ features: value }),
    errorMessage: 'Provide at least one feature (one per line).'
  },
  icon: {
    label: 'Icon/emoji',
    optional: true,
    transform: (value) => value.trim(),
    validate: () => true,
    prepare: (value) => ({ icon: value || '💎' }),
  },
  cryptoBonus: {
    label: 'Crypto bonus',
    optional: true,
    transform: (value) => value.trim(),
    validate: () => true,
    prepare: (value) => ({ cryptoBonus: value || null }),
  },
  currency: {
    label: 'Currency code',
    optional: true,
    transform: (value) => {
      const trimmed = value.trim();
      if (!trimmed || trimmed.toLowerCase() === 'skip') {
        return undefined;
      }
      return trimmed.toUpperCase();
    },
    validate: () => true,
    prepare: (value) => ({ currency: value }),
  },
  recommended: {
    label: 'Recommended (yes/no)',
    optional: true,
    transform: (value) => {
      const normalized = value.trim().toLowerCase();
      if (!normalized || normalized === 'skip') {
        return undefined;
      }
      if (['yes', 'y', 'true', '1'].includes(normalized)) {
        return true;
      }
      if (['no', 'n', 'false', '0'].includes(normalized)) {
        return false;
      }
      throw new Error('Reply with yes or no.');
    },
    validate: () => true,
    prepare: (value) => ({ recommended: value }),
  },
  paymentMethod: {
    label: 'Payment method (epayco/nequi/daimo)',
    transform: (value) => value.trim().toLowerCase(),
    validate: (value) => ['epayco', 'nequi', 'daimo'].includes(value),
    prepare: (value) => ({
      paymentMethod: value,
      requiresManualActivation: value === 'nequi'
    }),
    errorMessage: 'Payment method must be either "epayco", "nequi", or "daimo".'
  },
  paymentLink: {
    label: 'Payment link (for Nequi)',
    optional: true,
    transform: (value) => value.trim(),
    validate: () => true,
    prepare: (value) => ({ paymentLink: value || null }),
  },
};

function formatCurrency(value, currency = 'USD') {
  if (!Number.isFinite(value)) {
    return '-';
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    return `${value}`;
  }
}

function formatPlanSummary(plan) {
  const parts = [];
  const name = plan.displayName || plan.name || 'Unnamed plan';
  const icon = plan.icon || '💎';
  const priceLabel = formatCurrency(plan.price, plan.currency || 'USD');
  parts.push(`${icon} ${name}`);
  parts.push(`• Tier: ${plan.tier || 'n/a'}`);
  parts.push(`• Price: ${priceLabel}`);
  if (Number.isFinite(plan.priceInCOP)) {
    parts.push(`• Price (COP): ${plan.priceInCOP.toLocaleString('es-CO')}`);
  }
  if (plan.duration) {
    parts.push(`• Duration: ${plan.duration} days`);
  }
  parts.push(`• Status: ${plan.active === false ? 'inactive' : 'active'}`);
  if (plan.recommended) {
    parts.push('• Recommended: Yes');
  }
  return parts.join('\n');
}

function ensureAdmin(ctx) {
  if (ctx.state?.isAdmin || isAdmin(ctx.from?.id)) {
    return true;
  }
  if (ctx.answerCbQuery) {
    ctx.answerCbQuery('Not authorized', { show_alert: true }).catch(() => {});
  }
  return false;
}

async function showPlanDashboard(ctx, options = {}) {
  const replace = options.replace || false;

  if (!ensureAdmin(ctx)) {
    return;
  }

  const plans = await planService.getAllPlans();
  const textParts = ['💎 Plan Management'];

  if (plans.length === 0) {
    textParts.push('\n\nNo plans found. Tap "Create Plan" to add your first plan.');
  } else {
    textParts.push('\n');
    plans
      .sort((a, b) => (a.price || 0) - (b.price || 0))
      .forEach((plan, index) => {
        textParts.push(`\n${index + 1}. ${formatPlanSummary(plan)}`);
      });
  }

  const buttons = [
    [
      { text: '➕ Create Plan', callback_data: 'plan:create' },
      { text: '🔄 Refresh', callback_data: 'plan:refresh' },
    ],
  ];

  plans.forEach((plan) => {
    const label = `${plan.icon || '📋'} ${plan.displayName || plan.name || 'Plan'}`;
    buttons.push([{ text: label, callback_data: `plan:view:${plan.id}` }]);
  });

  const keyboard = Markup.inlineKeyboard(buttons);
  const message = textParts.join('\n');

  if (replace && ctx.updateType === 'callback_query') {
    try {
      await ctx.editMessageText(message, {
        reply_markup: keyboard.reply_markup,
      });
    } catch (error) {
      if (error.description && error.description.includes('message is not modified')) {
        // ignore
      } else {
        await ctx.reply(message, keyboard);
      }
    }
    await ctx.answerCbQuery().catch(() => {});
  } else {
    await ctx.reply(message, keyboard);
  }
}

async function showPlanDetails(ctx, planId, options = {}) {
  const replace = options.replace !== undefined ? options.replace : true;

  if (!ensureAdmin(ctx)) {
    return;
  }

  const plan = await planService.getPlanById(planId);
  if (!plan) {
    if (ctx.answerCbQuery) {
      await ctx.answerCbQuery('Plan not found', { show_alert: true }).catch(() => {});
    }
    await showPlanDashboard(ctx, { replace: true });
    return;
  }

  const lines = [];
  lines.push(`${plan.icon || '💎'} ${plan.displayName || plan.name || 'Plan'}`);
  lines.push(`ID: ${plan.id}`);
  lines.push(`Tier: ${plan.tier || 'n/a'}`);
  lines.push(`Price: ${formatCurrency(plan.price, plan.currency || 'USD')}`);
  if (Number.isFinite(plan.priceInCOP)) {
    lines.push(`Price (COP): ${plan.priceInCOP.toLocaleString('es-CO')}`);
  }
  if (plan.duration) {
    lines.push(`Duration: ${plan.duration} days`);
  }
  lines.push(`Payment method: ${plan.paymentMethod || 'epayco'}`);
  if (plan.paymentMethod === 'nequi' && plan.paymentLink) {
    lines.push(`Payment link: ${plan.paymentLink}`);
  }
  lines.push(`Manual activation: ${plan.requiresManualActivation ? 'Yes' : 'No'}`);
  lines.push(`Status: ${plan.active === false ? 'Inactive' : 'Active'}`);
  lines.push(`Recommended: ${plan.recommended ? 'Yes' : 'No'}`);
  lines.push(`Description: ${plan.description || '—'}`);

  if (Array.isArray(plan.features) && plan.features.length > 0) {
    lines.push('\nFeatures:');
    plan.features.forEach((feature) => {
      lines.push(` • ${feature}`);
    });
  } else {
    lines.push('\nFeatures: (none)');
  }

  if (plan.cryptoBonus) {
    lines.push(`\nCrypto bonus: ${plan.cryptoBonus}`);
  }

  const isEditable = Boolean(plan.createdAt);

  const buttons = [];
  if (isEditable) {
    buttons.push([{ text: '✏️ Edit', callback_data: `plan:edit:${plan.id}` }]);
    if (plan.active === false) {
      buttons.push([{ text: '♻️ Activate', callback_data: `plan:toggle:${plan.id}:activate` }]);
    } else {
      buttons.push([{ text: '🗑️ Archive', callback_data: `plan:toggle:${plan.id}:archive` }]);
    }
    buttons.push([{ text: '❌ Delete Plan', callback_data: `plan:delete:${plan.id}` }]);
  } else {
    buttons.push([{ text: 'ℹ️ Read-only plan', callback_data: 'plan:refresh' }]);
  }

  buttons.push([{ text: '⬅️ Back to Plans', callback_data: 'plan:refresh' }]);

  const keyboard = Markup.inlineKeyboard(buttons);
  const message = lines.join('\n');

  if (replace && ctx.updateType === 'callback_query') {
    try {
      await ctx.editMessageText(message, { reply_markup: keyboard.reply_markup });
    } catch (error) {
      await ctx.reply(message, keyboard);
    }
    await ctx.answerCbQuery().catch(() => {});
  } else {
    await ctx.reply(message, keyboard);
  }
}

function promptCreationStep(ctx) {
  const state = ctx.session.planCreation;
  let step = PLAN_CREATION_STEPS[state.stepIndex];

  // Skip conditional steps that don't apply
  while (step && step.conditional && !step.conditional(state.data)) {
    state.stepIndex++;
    step = PLAN_CREATION_STEPS[state.stepIndex];
  }

  if (!step) {
    return;
  }

  let prompt = step.prompt;
  prompt += '\n\nSend "cancel" to abort.';
  if (step.optional && !step.conditional) {
    prompt += ' Send "skip" to leave this field blank.';
  }
  ctx.reply(prompt);
}

async function startPlanCreationFlow(ctx) {
  if (!ensureAdmin(ctx)) {
    return;
  }

  ctx.session.planCreation = {
    stepIndex: 0,
    data: {},
  };

  await ctx.answerCbQuery().catch(() => {});

  const welcomeMsg = `💎 **Enhanced Plan Creation Wizard**\n\n` +
    `Let's create a new subscription plan with improved validation!\n\n` +
    `**Features:**\n` +
    `✓ Step-by-step guidance\n` +
    `✓ Smart validation\n` +
    `✓ Live preview before saving\n` +
    `✓ Support for multiple payment methods\n\n` +
    `Type "cancel" at any time to stop.`;

  await ctx.reply(welcomeMsg, { parse_mode: 'Markdown' });
  promptCreationStep(ctx);
}

async function handlePlanCreationResponse(ctx, text) {
  const state = ctx.session.planCreation;
  if (!state) {
    return false;
  }

  const step = PLAN_CREATION_STEPS[state.stepIndex];
  if (!step) {
    ctx.session.planCreation = null;
    return false;
  }

  const lower = text.trim().toLowerCase();
  if (lower === 'cancel') {
    ctx.session.planCreation = null;
    await ctx.reply('Plan creation cancelled.');
    await showPlanDashboard(ctx);
    return true;
  }

  let value;
  try {
    if (step.optional && lower === 'skip') {
      value = undefined;
    } else if (step.transform) {
      value = step.transform(text);
    } else {
      value = text.trim();
    }
  } catch (error) {
    await ctx.reply(error.message || 'Invalid value. Please try again.');
    return true;
  }

  if (step.validate && !(step.optional && value === undefined)) {
    try {
      const isValid = step.validate(value);
      if (!isValid) {
        await ctx.reply(step.errorMessage || 'Invalid value. Please try again.');
        return true;
      }
    } catch (error) {
      await ctx.reply(step.errorMessage || error.message || 'Invalid value. Please try again.');
      return true;
    }
  }

  if (value !== undefined) {
    state.data[step.key] = value;
  }

  state.stepIndex += 1;

  if (state.stepIndex >= PLAN_CREATION_STEPS.length) {
    // Show preview before creating
    await showPlanCreationPreview(ctx);
    return true;
  }

  promptCreationStep(ctx);
  return true;
}

async function handlePlanEditResponse(ctx, text) {
  const state = ctx.session.planEdit;
  if (!state) {
    return false;
  }

  const lower = text.trim().toLowerCase();
  if (lower === 'cancel') {
    ctx.session.planEdit = null;
    await ctx.reply('Plan update cancelled.');
    await showPlanDetails(ctx, state.planId);
    return true;
  }

  const fieldConfig = PLAN_EDIT_FIELDS[state.field];
  if (!fieldConfig) {
    ctx.session.planEdit = null;
    await ctx.reply('Invalid field.');
    return false;
  }

  let value;
  try {
    if (fieldConfig.optional && lower === 'skip') {
      value = undefined;
    } else if (fieldConfig.transform) {
      value = fieldConfig.transform(text);
    } else {
      value = text.trim();
    }
  } catch (error) {
    await ctx.reply(error.message || 'Invalid value. Please try again.');
    return true;
  }

  if (fieldConfig.validate && !(fieldConfig.optional && value === undefined)) {
    try {
      const isValid = fieldConfig.validate(value);
      if (!isValid) {
        await ctx.reply(fieldConfig.errorMessage || 'Invalid value. Please try again.');
        return true;
      }
    } catch (error) {
      await ctx.reply(fieldConfig.errorMessage || error.message || 'Invalid value. Please try again.');
      return true;
    }
  }

  try {
    const updates = value !== undefined ? fieldConfig.prepare(value) : {};
    await planService.updatePlan(state.planId, updates);
    ctx.session.planEdit = null;
    await ctx.reply('✅ Plan updated successfully.');
    await showPlanDetails(ctx, state.planId, { replace: false });
  } catch (error) {
    logger.error('Error updating plan:', error);
    await ctx.reply(`❌ Failed to update plan: ${error.message}`);
    ctx.session.planEdit = null;
  }

  return true;
}

async function handlePlanCallback(ctx) {
  if (!ensureAdmin(ctx)) {
    return;
  }

  const data = ctx.callbackQuery?.data || '';
  const parts = data.split(':');

  try {
    if (data === 'plan:refresh') {
      await showPlanDashboard(ctx, { replace: true });
      return;
    }

    if (data === 'plan:create') {
      await startPlanCreationFlow(ctx);
      return;
    }

    if (parts[0] === 'plan' && parts[1] === 'view' && parts[2]) {
      await showPlanDetails(ctx, parts[2]);
      return;
    }

    if (parts[0] === 'plan' && parts[1] === 'edit' && parts[2]) {
      await showPlanEditMenu(ctx, parts[2]);
      await ctx.answerCbQuery().catch(() => {});
      return;
    }

    if (parts[0] === 'plan' && parts[1] === 'editField' && parts[2] && parts[3]) {
      await startPlanEditField(ctx, parts[2], parts[3]);
      await ctx.answerCbQuery().catch(() => {});
      return;
    }

    if (parts[0] === 'plan' && parts[1] === 'toggle' && parts[2] && parts[3]) {
      const planId = parts[2];
      const action = parts[3];
      const active = action === 'activate';
      await planService.updatePlan(planId, { active });
      await ctx.answerCbQuery(`Plan ${active ? 'activated' : 'archived'} successfully`).catch(() => {});
      await showPlanDetails(ctx, planId, { replace: true });
      return;
    }

    if (parts[0] === 'plan' && parts[1] === 'delete' && parts[2]) {
      await showDeleteConfirmation(ctx, parts[2]);
      await ctx.answerCbQuery().catch(() => {});
      return;
    }

    if (parts[0] === 'plan' && parts[1] === 'deleteConfirm' && parts[2]) {
      await planService.hardDeletePlan(parts[2]);
      await ctx.answerCbQuery('Plan deleted permanently').catch(() => {});
      await ctx.reply('✅ Plan has been permanently deleted.');
      await showPlanDashboard(ctx, { replace: false });
      return;
    }

    if (parts[0] === 'plan' && parts[1] === 'deleteCancel' && parts[2]) {
      await showPlanDetails(ctx, parts[2], { replace: true });
      await ctx.answerCbQuery('Delete cancelled').catch(() => {});
      return;
    }

    if (data === 'plan:confirmCreate') {
      await confirmPlanCreation(ctx);
      return;
    }

    if (data === 'plan:editPreview') {
      await ctx.answerCbQuery('Restarting wizard...').catch(() => {});
      const state = ctx.session.planCreation;
      if (state) {
        state.stepIndex = 0;
        await ctx.reply('Let\'s edit your plan. Starting from the beginning...');
        promptCreationStep(ctx);
      }
      return;
    }

    if (data === 'plan:cancelCreate') {
      ctx.session.planCreation = null;
      await ctx.answerCbQuery('Plan creation cancelled').catch(() => {});
      await ctx.reply('❌ Plan creation cancelled.');
      await showPlanDashboard(ctx, { replace: false });
      return;
    }

    await ctx.answerCbQuery('Unknown action').catch(() => {});
  } catch (error) {
    logger.error('Plan callback error:', error);
    await ctx.answerCbQuery('Error handling plan action', { show_alert: true }).catch(() => {});
    await ctx.reply(`❌ ${error.message || 'An error occurred.'}`);
  }
}

async function handlePlanTextResponse(ctx) {
  if (ctx.session?.planCreation) {
    return await handlePlanCreationResponse(ctx, ctx.message.text);
  }
  if (ctx.session?.planEdit) {
    return await handlePlanEditResponse(ctx, ctx.message.text);
  }
  return false;
}

async function showPlanEditMenu(ctx, planId) {
  const plan = await planService.getPlanById(planId);
  if (!plan) {
    await ctx.reply('Plan not found.');
    await showPlanDashboard(ctx, { replace: true });
    return;
  }

  const isEditable = Boolean(plan.createdAt);
  if (!isEditable) {
    await ctx.reply('This plan is read-only. You can create a new plan to customize tiers.');
    await showPlanDashboard(ctx, { replace: true });
    return;
  }

  const buttons = [
    [
      { text: 'Name', callback_data: `plan:editField:${planId}:name` },
      { text: 'Display name', callback_data: `plan:editField:${planId}:displayName` },
    ],
    [
      { text: 'Tier', callback_data: `plan:editField:${planId}:tier` },
      { text: 'Duration', callback_data: `plan:editField:${planId}:duration` },
    ],
    [
      { text: 'Price (USD)', callback_data: `plan:editField:${planId}:price` },
      { text: 'Price (COP)', callback_data: `plan:editField:${planId}:priceInCOP` },
    ],
    [
      { text: 'Currency', callback_data: `plan:editField:${planId}:currency` },
      { text: 'Recommended', callback_data: `plan:editField:${planId}:recommended` },
    ],
    [
      { text: 'Payment method', callback_data: `plan:editField:${planId}:paymentMethod` },
      { text: 'Payment link', callback_data: `plan:editField:${planId}:paymentLink` },
    ],
    [
      { text: 'Description', callback_data: `plan:editField:${planId}:description` },
      { text: 'Features', callback_data: `plan:editField:${planId}:features` },
    ],
    [
      { text: 'Icon', callback_data: `plan:editField:${planId}:icon` },
      { text: 'Crypto bonus', callback_data: `plan:editField:${planId}:cryptoBonus` },
    ],
    [{ text: '⬅️ Back', callback_data: `plan:view:${planId}` }],
  ];

  await ctx.editMessageText('Select the field you want to modify:', {
    reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
  });
}

async function startPlanEditField(ctx, planId, field) {
  const fieldConfig = PLAN_EDIT_FIELDS[field];
  if (!fieldConfig) {
    await ctx.reply('This field is not editable.');
    return;
  }

  ctx.session.planEdit = {
    planId,
    field,
  };

  let prompt = `Send the new value for ${fieldConfig.label}.`;
  prompt += '\nType "cancel" to abort.';
  if (fieldConfig.optional) {
    prompt += '\nType "skip" to leave unchanged.';
  }

  await ctx.reply(prompt);
}

async function showPlanCreationPreview(ctx) {
  if (!ensureAdmin(ctx)) {
    return;
  }

  const state = ctx.session.planCreation;
  if (!state || !state.data) {
    await ctx.reply('❌ Error: No plan data found.');
    return;
  }

  const data = state.data;

  // Build preview message
  const lines = [];
  lines.push('💎 **Plan Creation Preview**\n');
  lines.push('**Please review your plan details:**\n');
  lines.push(`${data.icon || '💎'} **${data.displayName || data.name}**`);
  lines.push(`Tier: ${data.tier}`);
  lines.push(`Price: ${formatCurrency(data.price, data.currency || 'USD')}`);

  if (Number.isFinite(data.priceInCOP)) {
    lines.push(`Price (COP): ${data.priceInCOP.toLocaleString('es-CO')}`);
  }

  lines.push(`Duration: ${data.duration} days`);
  lines.push(`Payment Method: ${(data.paymentMethod || 'epayco').toUpperCase()}`);

  if (data.paymentMethod === 'nequi' && data.paymentLink) {
    lines.push(`Payment Link: ${data.paymentLink}`);
  }

  if (data.description) {
    lines.push(`\nDescription: ${data.description}`);
  }

  if (Array.isArray(data.features) && data.features.length > 0) {
    lines.push('\n**Features:**');
    data.features.forEach((feature) => {
      lines.push(` • ${feature}`);
    });
  }

  if (data.cryptoBonus) {
    lines.push(`\n**Crypto Bonus:** ${data.cryptoBonus}`);
  }

  if (data.recommended) {
    lines.push('\n⭐ Recommended plan');
  }

  lines.push('\n**Ready to create this plan?**');

  const keyboard = Markup.inlineKeyboard([
    [
      { text: '✅ Create Plan', callback_data: 'plan:confirmCreate' },
    ],
    [
      { text: '✏️ Edit Details', callback_data: 'plan:editPreview' },
      { text: '❌ Cancel', callback_data: 'plan:cancelCreate' },
    ],
  ]);

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'Markdown',
    reply_markup: keyboard.reply_markup,
  });
}

async function confirmPlanCreation(ctx) {
  if (!ensureAdmin(ctx)) {
    return;
  }

  const state = ctx.session.planCreation;
  if (!state || !state.data) {
    await ctx.answerCbQuery('Session expired', { show_alert: true }).catch(() => {});
    return;
  }

  try {
    const payload = {
      name: state.data.name,
      displayName: state.data.displayName || state.data.name,
      tier: state.data.tier,
      price: state.data.price,
      priceInCOP: state.data.priceInCOP,
      currency: state.data.currency || 'USD',
      duration: state.data.duration,
      features: state.data.features,
      description: state.data.description || '',
      icon: state.data.icon || '💎',
      cryptoBonus: state.data.cryptoBonus || null,
      recommended: Boolean(state.data.recommended),
      paymentMethod: state.data.paymentMethod || 'epayco',
      paymentLink: state.data.paymentLink || null,
    };

    const newPlan = await planService.createPlan(payload);
    ctx.session.planCreation = null;

    let successMsg = `✅ **Plan created successfully!**\n\n`;
    successMsg += `${newPlan.icon || '💎'} **${newPlan.displayName || newPlan.name}**\n`;
    successMsg += `Payment method: ${newPlan.paymentMethod.toUpperCase()}\n`;

    if (newPlan.paymentMethod === 'nequi') {
      successMsg += `⚠️ Manual activation required for subscriptions.\n`;
      successMsg += `Payment link: ${newPlan.paymentLink}`;
    } else if (newPlan.paymentMethod === 'daimo') {
      successMsg += `✓ Automatic activation via Daimo Pay API`;
    } else {
      successMsg += `✓ Automatic activation via ePayco API`;
    }

    await ctx.answerCbQuery('Plan created!').catch(() => {});
    await ctx.reply(successMsg, { parse_mode: 'Markdown' });
    await showPlanDashboard(ctx, { replace: false });
  } catch (error) {
    logger.error('Error creating plan:', error);
    await ctx.answerCbQuery('Error creating plan', { show_alert: true }).catch(() => {});
    await ctx.reply(`❌ Failed to create plan: ${error.message}`);
    ctx.session.planCreation = null;
  }
}

async function showDeleteConfirmation(ctx, planId) {
  if (!ensureAdmin(ctx)) {
    return;
  }

  const plan = await planService.getPlanById(planId);
  if (!plan) {
    await ctx.answerCbQuery('Plan not found', { show_alert: true }).catch(() => {});
    await showPlanDashboard(ctx, { replace: true });
    return;
  }

  const message = `⚠️ WARNING: Delete Plan?\n\n` +
    `Plan: ${plan.icon || '💎'} ${plan.displayName || plan.name}\n` +
    `Tier: ${plan.tier}\n` +
    `Price: ${formatCurrency(plan.price, plan.currency || 'USD')}\n\n` +
    `⚠️ This action CANNOT be undone!\n` +
    `All plan data will be permanently deleted.\n\n` +
    `Are you absolutely sure?`;

  const buttons = [
    [
      { text: '✅ Yes, Delete Forever', callback_data: `plan:deleteConfirm:${planId}` },
    ],
    [
      { text: '❌ No, Cancel', callback_data: `plan:deleteCancel:${planId}` },
    ],
  ];

  const keyboard = Markup.inlineKeyboard(buttons);

  try {
    await ctx.editMessageText(message, { reply_markup: keyboard.reply_markup });
  } catch (error) {
    await ctx.reply(message, keyboard);
  }
}

module.exports = {
  showPlanDashboard,
  handlePlanCallback,
  handlePlanTextResponse,
  formatPlanSummary,
};
