const WizardScene = require('telegraf/scenes/wizard');
const { Markup } = require('telegraf');
const planService = require('../../services/planService');

const editPlanWizard = new WizardScene(
  'editPlanWizard',
  async (ctx) => {
    const plans = await planService.getActivePlans();
    const buttons = plans.map(p => [
      Markup.button.callback(`${p.name} - $${p.price}`, `edit_plan:${p.id}`)
    ]);
    
    await ctx.reply('Select plan to edit:', 
      Markup.inlineKeyboard([
        ...buttons,
        [Markup.button.callback('Cancel', 'cancel_edit')]
      ])
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const planId = ctx.callbackQuery?.data.split(':')[1];
    ctx.wizard.state.planId = planId;
    ctx.wizard.state.updates = {};
    
    await ctx.reply('What do you want to edit?',
      Markup.inlineKeyboard([
        [Markup.button.callback('Name', 'edit_name')],
        [Markup.button.callback('Price', 'edit_price')],
        [Markup.button.callback('Duration', 'edit_duration')],
        [Markup.button.callback('Features', 'edit_features')],
        [Markup.button.callback('Save', 'save_changes')],
        [Markup.button.callback('Cancel', 'cancel_edit')]
      ])
    );
    return ctx.wizard.next();
  }
);

module.exports = editPlanWizard;
