#!/usr/bin/env node

const { db } = require('./src/config/firebase');

// Quick check to see if the USDC Base deposit address is configured correctly
const target = '0xcaf17dbbccc0e9ac87dad1af1f2fe3ba3a4d0613'.toLowerCase();

function containsTarget(obj) {
  if (!obj || typeof obj !== 'object') return false;
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (!val) continue;
    if (typeof val === 'string' && val.toLowerCase() === target) return true;
    if (typeof val === 'string' && val.toLowerCase().includes(target)) return true;
    if (typeof val === 'object') {
      if (containsTarget(val)) return true;
    }
  }
  return false;
}

(async () => {
  console.log('Searching payments and payment_intents for address:', target);
  try {
    const collNames = ['payments', 'payment_intents', 'daimo_payments', 'transactions', 'orders'];
    for (const coll of collNames) {
      const snap = await db.collection(coll).get();
      console.log(`\nCollection: ${coll} - docs: ${snap.size}`);
      let found = 0;
      snap.forEach(doc => {
        const data = doc.data();
        if (containsTarget(data)) {
          found++;
          console.log('  MATCH ->', coll, doc.id, JSON.stringify(data));
        }
      });
      if (found === 0) console.log('  No matches in', coll);
    }
  } catch (err) {
    console.error('Error querying Firestore:', err);
    process.exit(1);
  }
})();
