// This script previously created the 'test-1usd' plan.
// The $1 test plan has been removed from the codebase.
// If you need to remove the Firestore document, run a one-off admin script
// or delete the document from the Firebase Console: subscriptionPlans/test-1usd

console.log("add-test-plan.js removed: 'test-1usd' plan should not be (re)created from code.");

module.exports = async function noop() { return { removed: true }; };