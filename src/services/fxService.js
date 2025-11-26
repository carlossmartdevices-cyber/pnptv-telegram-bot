import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let cachedFx = {
  rate: env.fx.fallback,
  fetchedAt: null
};

export const getFxRate = async () => {
  const ttlMs = env.fx.cacheTtlMin * 60 * 1000;
  const now = Date.now();
  if (cachedFx.fetchedAt && now - cachedFx.fetchedAt < ttlMs) {
    return cachedFx.rate;
  }

  if (env.fx.sourceDisabled) {
    logger.warn('FX source disabled, returning fallback rate');
    return cachedFx.rate;
  }

  try {
    const response = await axios.get(env.fx.sourceUrl, { timeout: 5_000 });
    const usdToCop = response.data?.rates?.COP;
    if (!usdToCop) {
      throw new Error('COP rate not found');
    }
    cachedFx = {
      rate: parseFloat(usdToCop),
      fetchedAt: now
    };
    logger.info('FX rate refreshed', cachedFx.rate);
    return cachedFx.rate;
  } catch (error) {
    logger.error('Failed to fetch FX rate, using fallback', error.message);
    return cachedFx.rate;
  }
};

export const primeFxCache = async () => {
  try {
    await getFxRate();
  } catch (error) {
    logger.error('Unable to prime FX cache', error.message);
  }
};
