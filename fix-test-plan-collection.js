#!/usr/bin/env node

/**
 * Fix Test Plan Collection
 * Add test plan to the correct "plans" collection that planService uses
 */

require('dotenv').config();

const { db } = require('./src/config/firebase');

// fix-test-plan-collection.js retired
// The 1 USD test plan has been removed from the codebase. This script is now a no-op.

console.log("fix-test-plan-collection.js retired: no action taken.");

module.exports = async function noop() { return { retired: true }; };