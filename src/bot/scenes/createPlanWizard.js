const WizardScene = require("telegraf/scenes/wizard");
const planService = require("../../services/planService");

const createPlanWizard = new WizardScene(
  "createPlanWizard",
  async (ctx) => {
    ctx.reply("Enter plan name:");
    ctx.wizard.state.planData = {};
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.planData.name = ctx.message.text;
    ctx.reply("Enter price (in USD):");
    return ctx.wizard.next();
  },
  async (ctx) => {
    const price = parseFloat(ctx.message.text);
    if (isNaN(price)) {
      ctx.reply("Invalid price. Please enter a number.");
      return;
    }
    ctx.wizard.state.planData.price = price;
    ctx.reply("Enter duration (in days):");
    return ctx.wizard.next();
  },
  async (ctx) => {
    const duration = parseInt(ctx.message.text);
    if (isNaN(duration)) {
      ctx.reply("Invalid duration. Please enter a number.");
      return;
    }
    ctx.wizard.state.planData.duration = duration;
    ctx.reply("Enter features (one per line):");
    return ctx.wizard.next();
  },
  async (ctx) => {
    const features = ctx.message.text.split("\n").filter((f) => f.trim());
    ctx.wizard.state.planData.features = features;

    try {
      await planService.createPlan(ctx.wizard.state.planData);
      ctx.reply("✅ Plan created successfully!");
    } catch (error) {
      ctx.reply("❌ Error creating plan: " + error.message);
    }

    return ctx.scene.leave();
  }
);

module.exports = createPlanWizard;
