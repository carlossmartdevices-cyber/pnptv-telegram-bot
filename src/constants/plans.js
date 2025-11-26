export const PLANS = {
  silver_30d: {
    sku: 'silver_30d',
    label: 'Silver 30 días',
    usdPrice: 15,
    durationDays: 30,
    benefits: ['silver-tier', 'ad-free', 'priority-support']
  },
  golden_30d: {
    sku: 'golden_30d',
    label: 'Golden 30 días',
    usdPrice: 25,
    durationDays: 30,
    benefits: ['gold-tier', 'super-boost', 'vip-chat']
  }
};

export const ADDONS = {
  plus_pack: {
    sku: 'plus_pack',
    label: 'Plus Pack',
    usdPrice: 5,
    benefits: ['profile-plus-badge']
  },
  boost: {
    sku: 'boost',
    label: 'Boost Destacado',
    usdPrice: 2.5,
    benefits: ['featured-profile-48h']
  }
};

export const ORDER_STATUS = {
  CREATED: 'created',
  PENDING: 'pending',
  APPROVED: 'approved',
  FAILED: 'failed',
  EXPIRED: 'expired',
  REFUNDED: 'refunded'
};
