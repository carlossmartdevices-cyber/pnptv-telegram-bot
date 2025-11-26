import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable ${key}`);
  }
  return value;
};

export const env = {
  bold: {
    apiKey: requiredEnv('BOLD_API_KEY'),
    redirectUrl: requiredEnv('BOLD_REDIRECT_URL'),
    callbackUrl: requiredEnv('BOLD_CALLBACK_URL')
  },
  app: {
    baseUrl: requiredEnv('APP_BASE_URL'),
    apiBaseUrl: requiredEnv('API_BASE_URL')
  },
  db: {
    url: requiredEnv('DATABASE_URL')
  },
  fx: {
    sourceDisabled: process.env.FX_SOURCE_DISABLED === 'true',
    fallback: parseFloat(process.env.FX_FALLBACK || '4200'),
    cacheTtlMin: parseInt(process.env.FX_CACHE_TTL_MIN || '60', 10),
    sourceUrl: process.env.FX_SOURCE_URL || 'https://open.er-api.com/v6/latest/USD'
  },
  telegram: {
    token: requiredEnv('TELEGRAM_BOT_TOKEN'),
    webAppUrl: requiredEnv('TELEGRAM_WEB_APP_URL')
  }
};
