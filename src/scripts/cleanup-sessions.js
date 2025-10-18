/**
 * Session Cleanup Script
 * Removes expired sessions from the database
 * Can be run manually or scheduled with cron
 *
 * Usage:
 *   node src/scripts/cleanup-sessions.js
 *   node src/scripts/cleanup-sessions.js --dry-run
 *   node src/scripts/cleanup-sessions.js --verbose
 */

require('../config/env');
const sessionManager = require('../utils/sessionManager');
const logger = require('../utils/logger');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose') || args.includes('-v');
const help = args.includes('--help') || args.includes('-h');

/**
 * Display help information
 */
function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║              Session Cleanup Script                        ║
╚════════════════════════════════════════════════════════════╝

Removes expired sessions from the database to free up storage
and improve query performance.

USAGE:
  node src/scripts/cleanup-sessions.js [options]

OPTIONS:
  --dry-run         Show what would be deleted without actually deleting
  --verbose, -v     Show detailed progress information
  --help, -h        Show this help message

EXAMPLES:
  # Run cleanup (deletes expired sessions)
  node src/scripts/cleanup-sessions.js

  # Preview what would be deleted
  node src/scripts/cleanup-sessions.js --dry-run

  # Run with detailed output
  node src/scripts/cleanup-sessions.js --verbose

SCHEDULING WITH CRON:
  # Run daily at 3 AM
  0 3 * * * cd /path/to/bot && node src/scripts/cleanup-sessions.js >> logs/cleanup.log 2>&1

  # Run every hour
  0 * * * * cd /path/to/bot && node src/scripts/cleanup-sessions.js

ENVIRONMENT VARIABLES:
  Requires Firebase credentials configured in .env file

EXIT CODES:
  0  - Success
  1  - Error occurred
  `);
}

/**
 * Main cleanup function
 */
async function runCleanup() {
  const startTime = Date.now();

  try {
    console.log('');
    console.log('═'.repeat(60));
    console.log('  Session Cleanup Script');
    console.log('═'.repeat(60));
    console.log('');

    if (dryRun) {
      console.log('⚠️  DRY RUN MODE - No changes will be made');
      console.log('');
    }

    // Show configuration
    if (verbose) {
      console.log('Configuration:');
      console.log(`  Access Token Expiry: ${sessionManager.SESSION_CONFIG.ACCESS_TOKEN_EXPIRY}s (${(sessionManager.SESSION_CONFIG.ACCESS_TOKEN_EXPIRY / 3600).toFixed(1)}h)`);
      console.log(`  Refresh Token Expiry: ${sessionManager.SESSION_CONFIG.REFRESH_TOKEN_EXPIRY}s (${(sessionManager.SESSION_CONFIG.REFRESH_TOKEN_EXPIRY / 86400).toFixed(0)}d)`);
      console.log(`  Max Sessions Per User: ${sessionManager.SESSION_CONFIG.MAX_SESSIONS_PER_USER}`);
      console.log('');
    }

    // Run cleanup
    console.log('🔍 Scanning for expired sessions...');

    if (dryRun) {
      // In dry-run mode, we need to manually query to count
      const { db } = require('../config/firebase');
      const now = new Date();

      const expiredSessions = await db
        .collection('sessions')
        .where('active', '==', true)
        .where('refreshTokenExpiry', '<', now)
        .get();

      const count = expiredSessions.size;

      console.log('');
      if (count === 0) {
        console.log('✅ No expired sessions found');
      } else {
        console.log(`🗑️  Found ${count} expired session(s) that would be deleted`);

        if (verbose && count > 0) {
          console.log('');
          console.log('Expired Sessions:');
          expiredSessions.docs.forEach((doc, index) => {
            const data = doc.data();
            const expiredAt = data.refreshTokenExpiry.toDate();
            const userId = data.userId;
            const age = Math.floor((now - expiredAt) / (24 * 60 * 60 * 1000)); // days

            console.log(`  ${index + 1}. User: ${userId} | Expired: ${age} day(s) ago`);
          });
        }
      }

      console.log('');
      console.log('💡 Run without --dry-run to actually delete expired sessions');

    } else {
      // Actually cleanup
      const count = await sessionManager.cleanupExpiredSessions();

      console.log('');
      if (count === 0) {
        console.log('✅ No expired sessions found');
      } else {
        console.log(`✅ Successfully cleaned up ${count} expired session(s)`);
        logger.info(`[CLEANUP] Removed ${count} expired sessions`);
      }
    }

    const duration = Date.now() - startTime;
    console.log('');
    console.log(`⏱️  Completed in ${duration}ms`);
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ Error during cleanup:');
    console.error(`   ${error.message}`);
    console.error('');

    if (verbose) {
      console.error('Stack trace:');
      console.error(error.stack);
      console.error('');
    }

    logger.error('[CLEANUP] Session cleanup failed', {
      error: error.message,
      stack: error.stack,
    });

    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('');
  console.log('⚠️  Cleanup interrupted by user');
  console.log('');
  process.exit(130);
});

// Show help if requested
if (help) {
  showHelp();
  process.exit(0);
}

// Run cleanup
runCleanup();
