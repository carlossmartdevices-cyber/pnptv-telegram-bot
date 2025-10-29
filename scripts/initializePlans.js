/**
 * Initialize Default Subscription Plans
 * Run this script to create the default Silver and Golden plans in Firestore
 */

require("../src/config/env");
const { db } = require("../src/config/firebase");
const logger = require("../src/utils/logger");

const DEFAULT_PLANS = [
  {
    id: "trial-pass",
    name: "Trial Week",
    displayName: "Trial Week",
    tier: "Trial",
    price: 15,
    priceInCOP: 60000, // ~$15 USD in COP (adjust based on exchange rate)
    currency: "USD",
    duration: 7, // days
    description: "Try premium features for a week",
    features: [
      "Access to PNPtv! PRIME channel",
      "Who is nearby? feature in bot",
      "PNPtv! Live (coming soon!)",
      "Members Telegram Group",
      "7 days full access"
    ],
    icon: "🎫",
    recommended: false,
    paymentMethod: "epayco",
    requiresManualActivation: false,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "pnp-member",
    name: "Prime Member",
    displayName: "Prime Member",
    tier: "Prime",
    price: 25,
    priceInCOP: 100000, // ~$25 USD in COP (adjust based on exchange rate)
    currency: "USD",
    duration: 30, // days
    description: "Full premium access for a month",
    features: [
      "Access to PNPtv! PRIME channel",
      "Who is nearby? feature in bot",
      "PNPtv! Live (coming soon!)",
      "Members Telegram Group",
      "Priority support",
      "30 days access"
    ],
    icon: "💎",
    recommended: true,
    paymentMethod: "epayco",
    requiresManualActivation: false,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "crystal-member",
    name: "Crystal Member",
    displayName: "Crystal Member",
    tier: "Crystal",
    price: 50,
    priceInCOP: 200000, // ~$50 USD in COP (adjust based on exchange rate)
    currency: "USD",
    duration: 120, // days (4 months)
    description: "Extended premium experience",
    features: [
      "Access to PNPtv! PRIME channel",
      "Who is nearby? feature in bot",
      "PNPtv! Live (coming soon!)",
      "Members Telegram Group",
      "Crystal member badge - early access to new features",
      "120 days access (4 months)"
    ],
    icon: "💠",
    recommended: false,
    paymentMethod: "epayco",
    requiresManualActivation: false,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "diamond-member",
    name: "Diamond Member",
    displayName: "Diamond Member",
    tier: "Diamond",
    price: 100,
    priceInCOP: 400000, // ~$100 USD in COP (adjust based on exchange rate)
    currency: "USD",
    duration: 365, // days (1 year)
    description: "Ultimate premium experience for a full year",
    features: [
      "Access to PNPtv! PRIME channel",
      "Who is nearby? feature in bot",
      "PNPtv! Live (coming soon!)",
      "Members Telegram Group",
      "Diamond member badge - early access to new features",
      "365 days access (1 year)"
    ],
    icon: "💎",
    cryptoBonus: null,
    recommended: false,
    paymentMethod: "epayco",
    requiresManualActivation: false,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

async function initializePlans() {
  try {
    console.log("🚀 Initializing default subscription plans...\n");

    // Check if plans already exist
    const existingPlans = await db.collection("plans").get();

    if (!existingPlans.empty) {
      console.log("⚠️  Plans already exist in Firestore:");
      existingPlans.forEach(doc => {
        const plan = doc.data();
        console.log(`   - ${plan.displayName || plan.name} (${doc.id})`);
      });

      console.log("\nDo you want to:");
      console.log("1. Keep existing plans (recommended)");
      console.log("2. Add default plans alongside existing ones");
      console.log("3. Replace all plans with defaults");
      console.log("\nPlease run this script with an argument:");
      console.log("  npm run init:plans keep");
      console.log("  npm run init:plans add");
      console.log("  npm run init:plans replace");
      return;
    }

    // Create default plans
    const batch = db.batch();

    for (const plan of DEFAULT_PLANS) {
      const planRef = db.collection("plans").doc(plan.id);
      batch.set(planRef, plan);
      console.log(`✅ Creating plan: ${plan.displayName} ($${plan.price}/month)`);
    }

    await batch.commit();

    console.log("\n🎉 Success! Default plans have been created:");
    console.log("\n📋 Plans Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    for (const plan of DEFAULT_PLANS) {
      console.log(`\n${plan.icon} ${plan.displayName.toUpperCase()}`);
      console.log(`   Price: $${plan.price}/month (${plan.priceInCOP.toLocaleString()} COP)`);
      console.log(`   Duration: ${plan.duration} days`);
      console.log(`   Tier: ${plan.tier}`);
      console.log(`   Features:`);
      plan.features.forEach(feature => {
        console.log(`      • ${feature}`);
      });
      if (plan.cryptoBonus) {
        console.log(`   Bonus: ${plan.cryptoBonus.amount} ${plan.cryptoBonus.currency}`);
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n✨ Your subscription plans are ready!");
    console.log("\n📱 Users can now subscribe via:");
    console.log("   • /subscribe command");
    console.log("   • 💎 Subscribe button in main menu");
    console.log("\n⚙️  Admins can manage plans via:");
    console.log("   • /admin → Plan Management");
    console.log("\n");

    logger.info("Default plans initialized successfully");

  } catch (error) {
    console.error("❌ Error initializing plans:", error);
    logger.error("Failed to initialize plans:", error);
    throw error;
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === "replace") {
  console.log("🔄 Replacing all existing plans with defaults...\n");
  db.collection("plans")
    .get()
    .then(snapshot => {
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      return batch.commit();
    })
    .then(() => initializePlans())
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
} else if (command === "add") {
  console.log("➕ Adding default plans alongside existing ones...\n");
  initializePlans()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
} else {
  // Default behavior - initialize if empty
  initializePlans()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
