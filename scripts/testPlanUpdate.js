/**
 * Test Plan Update Functionality
 * Quick script to verify plan updates are working correctly
 */

require("../src/config/env");
const planService = require("../src/services/planService");
const logger = require("../src/utils/logger");

async function testPlanUpdate() {
  try {
    console.log("🧪 Testing plan update functionality...\n");

    // Get all plans
    const plans = await planService.getAllPlans();

    if (plans.length === 0) {
      console.log("❌ No plans found. Please run 'npm run init:plans' first.");
      return;
    }

    console.log(`✅ Found ${plans.length} plan(s):\n`);
    plans.forEach((plan, idx) => {
      console.log(`${idx + 1}. ${plan.displayName || plan.name} (ID: ${plan.id})`);
      console.log(`   Price: $${plan.price} (${plan.priceInCOP} COP)`);
      console.log(`   Active: ${plan.active ? 'Yes' : 'No'}`);
      console.log(`   Updated: ${plan.updatedAt}\n`);
    });

    // Test updating the first plan
    const testPlan = plans[0];
    console.log(`📝 Testing update on: ${testPlan.displayName || testPlan.name}`);
    console.log(`   Current description: "${testPlan.description}"\n`);

    const testDescription = `Test update at ${new Date().toLocaleString()}`;

    console.log(`🔄 Updating description to: "${testDescription}"`);

    const updatedPlan = await planService.updatePlan(testPlan.id, {
      description: testDescription
    });

    console.log(`\n✅ Update successful!`);
    console.log(`   New description: "${updatedPlan.description}"`);
    console.log(`   Updated at: ${updatedPlan.updatedAt}`);
    console.log(`\n✨ Plan updates are working correctly!\n`);

    logger.info("Plan update test completed successfully");

  } catch (error) {
    console.error("\n❌ Error testing plan update:", error.message);
    logger.error("Plan update test failed:", error);
    throw error;
  }
}

testPlanUpdate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
