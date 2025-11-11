#!/usr/bin/env node

/**
 * Check Test Plan in Firestore
 * Run: node check-test-plan.js
 */

require('dotenv').config();

const { db } = require('./src/config/firebase');

// check-test-plan.js retired
// The $1 test plan script has been removed. If you need to inspect or delete
// the 'test-1usd' document, use the Firebase Console or write a one-off admin script.

console.log("check-test-plan.js retired: no action taken.");

module.exports = async function noop() { return { retired: true }; };