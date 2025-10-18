/**
 * Environment Configuration Loader and Validator
 * Loads and validates required environment variables with security checks
 */

const dotenv = require("dotenv");
const path = require("path");

let envLoaded = false;

/**
 * Required environment variables by category
 */
const REQUIRED_ENV_VARS = {
  critical: [
    'TELEGRAM_BOT_TOKEN',
    'FIREBASE_CREDENTIALS',  // Contains all Firebase config including client_email
  ],
  important: [
    'NODE_ENV',
    'PORT',
    'FIREBASE_PROJECT_ID',
  ],
  optional: [
    'FIREBASE_CLIENT_EMAIL',  // Optional - extracted from FIREBASE_CREDENTIALS
    'EPAYCO_PUBLIC_KEY',
    'EPAYCO_PRIVATE_KEY',
    'EPAYCO_P_CUST_ID',
    'EPAYCO_P_KEY',
    'SENTRY_DSN',
  ],
};

/**
 * Sensitive variable patterns that should never be logged
 */
const SENSITIVE_PATTERNS = [
  /token/i,
  /key/i,
  /secret/i,
  /password/i,
  /credential/i,
  /private/i,
];

/**
 * Check if a variable name is sensitive
 * @param {string} varName - Variable name
 * @returns {boolean}
 */
function isSensitiveVar(varName) {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(varName));
}

/**
 * Mask sensitive value for logging
 * @param {string} value - Value to mask
 * @returns {string}
 */
function maskValue(value) {
  if (!value || value.length < 8) {
    return '***';
  }
  return value.substring(0, 4) + '***' + value.substring(value.length - 4);
}

/**
 * Validate environment variables
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validateEnv(options = {}) {
  const { throwOnMissing = false, logWarnings = true } = options;

  const missing = {
    critical: [],
    important: [],
    optional: [],
  };

  const configured = {
    critical: [],
    important: [],
    optional: [],
  };

  // Check each category
  for (const [category, vars] of Object.entries(REQUIRED_ENV_VARS)) {
    for (const varName of vars) {
      const value = process.env[varName];

      if (!value || value.trim() === '') {
        missing[category].push(varName);
      } else {
        configured[category].push(varName);
      }
    }
  }

  // Check for variables that look like they contain sensitive data
  const exposedSecrets = [];
  for (const [key, value] of Object.entries(process.env)) {
    if (isSensitiveVar(key) && value) {
      // Check if value looks like a placeholder or example
      const placeholderPatterns = [
        /^your[-_]?/i,
        /^example/i,
        /^test[-_]?/i,
        /^changeme/i,
        /^placeholder/i,
        /xxx/i,
      ];

      if (placeholderPatterns.some(pattern => pattern.test(value))) {
        exposedSecrets.push({
          name: key,
          issue: 'Contains placeholder value',
        });
      }
    }
  }

  const hasErrors = missing.critical.length > 0;
  const hasWarnings = missing.important.length > 0 || exposedSecrets.length > 0;

  // Log results (safely)
  if (logWarnings) {
    if (hasErrors) {
      console.error('❌ CRITICAL: Missing required environment variables:');
      missing.critical.forEach(v => console.error(`   - ${v}`));
    }

    if (missing.important.length > 0) {
      console.warn('⚠️  WARNING: Missing important environment variables:');
      missing.important.forEach(v => console.warn(`   - ${v}`));
    }

    if (missing.optional.length > 0 && process.env.NODE_ENV !== 'production') {
      console.info('ℹ️  INFO: Missing optional environment variables:');
      missing.optional.forEach(v => console.info(`   - ${v}`));
    }

    if (exposedSecrets.length > 0) {
      console.warn('⚠️  WARNING: Potential security issues:');
      exposedSecrets.forEach(s => console.warn(`   - ${s.name}: ${s.issue}`));
    }

    if (!hasErrors && !hasWarnings) {
      console.log('✅ Environment variables validated successfully');
    }
  }

  // Throw error if critical variables are missing
  if (throwOnMissing && hasErrors) {
    throw new Error(
      `Missing critical environment variables: ${missing.critical.join(', ')}\n` +
      'Please configure these in your .env file before starting the application.'
    );
  }

  return {
    valid: !hasErrors,
    hasWarnings,
    missing,
    configured,
    exposedSecrets,
  };
}

/**
 * Load environment variables from .env file
 * @param {Object} options - Loading options
 */
const loadEnv = (options = {}) => {
  if (envLoaded) {
    return;
  }

  const { validate = true, throwOnError = false } = options;

  // Try to load .env file
  const envPath = path.resolve(process.cwd(), '.env');
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    if (result.error.code === "ENOENT") {
      console.warn(`⚠️  No .env file found at ${envPath}`);
      console.warn('   Using environment variables from system/hosting platform');
    } else if (throwOnError) {
      throw result.error;
    } else {
      console.error('❌ Error loading .env file:', result.error.message);
    }
  } else {
    console.log(`✅ Environment loaded from ${envPath}`);
  }

  envLoaded = true;

  // Validate environment after loading
  if (validate) {
    validateEnv({ throwOnMissing: throwOnError, logWarnings: true });
  }
};

/**
 * Get environment variable with validation
 * @param {string} key - Variable name
 * @param {*} defaultValue - Default value if not set
 * @param {Object} options - Options
 * @returns {string}
 */
function getEnv(key, defaultValue = null, options = {}) {
  const { required = false, sensitive = false } = options;

  const value = process.env[key];

  if (!value || value.trim() === '') {
    if (required) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return defaultValue;
  }

  // Don't log sensitive values
  if (!sensitive && !isSensitiveVar(key)) {
    console.debug(`[ENV] ${key} = ${value}`);
  } else {
    console.debug(`[ENV] ${key} = ${maskValue(value)}`);
  }

  return value;
}

/**
 * Check if running in production
 * @returns {boolean}
 */
function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 * @returns {boolean}
 */
function isDevelopment() {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

/**
 * Check if running in test mode
 * @returns {boolean}
 */
function isTest() {
  return process.env.NODE_ENV === 'test';
}

// Load environment on module import
loadEnv({ validate: true, throwOnError: false });

module.exports = {
  loadEnv,
  validateEnv,
  getEnv,
  isProduction,
  isDevelopment,
  isTest,
  isSensitiveVar,
  maskValue,
};
