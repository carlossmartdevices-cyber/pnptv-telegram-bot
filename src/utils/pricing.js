import { PLANS, ADDONS } from '../constants/plans.js';

export const resolvePlan = (sku) => {
  const plan = PLANS[sku];
  if (!plan) {
    throw new Error(`Plan with sku ${sku} not found`);
  }
  return plan;
};

export const resolveAddons = (addonSkus = []) => {
  return addonSkus.map((sku) => {
    const addon = ADDONS[sku];
    if (!addon) {
      throw new Error(`Addon with sku ${sku} not found`);
    }
    return addon;
  });
};

export const calculateUsdTotal = (plan, addons) => {
  const addonSum = addons.reduce((sum, addon) => sum + addon.usdPrice, 0);
  return parseFloat((plan.usdPrice + addonSum).toFixed(2));
};

export const copFromUsd = (usdAmount, fxRate) => {
  return Math.round(usdAmount * fxRate);
};
