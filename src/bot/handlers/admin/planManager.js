const { Markup } = require("telegraf");
const planService = require("../../../services/planService");

async function handlePlanManagement(ctx) {
  if (!ctx.state.isAdmin) return;

  return ctx.reply(
    "💎 Plan Management:",
    Markup.inlineKeyboard([
      [Markup.button.callback("➕ Create Plan", "create_plan")],
      [Markup.button.callback("📋 List Plans", "list_plans")],
      [Markup.button.callback("✏️ Edit Plan", "edit_plan")],
      [Markup.button.callback("❌ Delete Plan", "delete_plan")],
    ])
  );
}

async function startPlanCreation(ctx) {
  ctx.scene.enter("createPlanWizard");
}

async function listPlans(ctx) {
  const plans = await planService.getActivePlans();
  const message = plans
    .map((p) => `📌 ${p.name}\n💰 $${p.price}\n⏱️ ${p.duration} days\n`)
    .join("\n");

  return ctx.editMessageText(message || "No plans found");
}

async function handleEditPlan(ctx) {
  ctx.scene.enter("editPlanWizard");
}

async function handleDeletePlan(ctx) {
  const plans = await planService.getActivePlans();
  const buttons = plans.map((p) => [
    Markup.button.callback(`❌ ${p.name}`, `confirm_delete:${p.id}`),
  ]);

  return ctx.editMessageText(
    "Select plan to delete:",
    Markup.inlineKeyboard([
      ...buttons,
      [Markup.button.callback("Cancel", "cancel_delete")],
    ])
  );
}

async function confirmDeletePlan(ctx) {
  const planId = ctx.callbackQuery.data.split(":")[1];
  await planService.deletePlan(planId);
  return ctx.editMessageText("✅ Plan deleted successfully");
}

module.exports = {
  handlePlanManagement,
  startPlanCreation,
  listPlans,
  handleEditPlan,
  handleDeletePlan,
  confirmDeletePlan,
};
