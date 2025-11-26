// Canonical static plans fallback.
// Prefer using Firestore for plan management. This file provides a
// safe, centralized fallback for legacy code paths and for local dev.
// Keep values minimal and accurate to the current production plans.
//
// NEW TIER SYSTEM:
// - Free: Default tier, no paid features
// - Basic: Premium channel access (trial-week and pnp-member plans)
// - Premium: All features (crystal-member and diamond-member plans)
const plans = {
	TRIAL_WEEK: {
		id: 'trial-week',
		name: 'Trial Week',
		displayName: 'Trial Week',
		price: 14.99,
		priceInCOP: 14.99 * 4000,
		currency: 'USD',
		duration: 7,
		durationDays: 7,
		tier: 'Basic',
		description: 'One week trial to explore premium channel',
		features: ['Premium channel access', 'HD streaming'],
		active: true,
		wompiPaymentLink: 'https://checkout.nequi.wompi.co/l/p3eKDu',
	},
	PNP_MEMBER: {
		id: 'pnp-member',
		name: 'PNP Member',
		displayName: 'PNP Member',
		price: 24.99,
		priceInCOP: 24.99 * 4000,
		currency: 'USD',
		duration: 30,
		durationDays: 30,
		tier: 'Basic',
		description: 'Monthly membership with premium channel access',
		features: ['Premium channel access', 'HD streaming', 'Basic support'],
		active: true,
		wompiPaymentLink: 'https://checkout.nequi.wompi.co/l/3eyFhA',
	},
	PNP_CRYSTAL: {
		id: 'crystal-member',
		name: 'PNP Crystal Member',
		displayName: 'PNP Crystal Member',
		price: 49.99,
		priceInCOP: 49.99 * 4000,
		currency: 'USD',
		duration: 120,
		durationDays: 120,
		tier: 'Premium',
		description: '4-month package with all premium features',
		features: ['All premium features', 'Video calls', 'Live streaming', '4K streaming', 'Priority support'],
		active: true,
		wompiPaymentLink: 'https://checkout.nequi.wompi.co/l/tpS71x',
	},
	PNP_DIAMOND: {
		id: 'diamond-member',
		name: 'PNP Diamond Member',
		displayName: 'PNP Diamond Member',
		price: 99.99,
		priceInCOP: 99.99 * 4000,
		currency: 'USD',
		duration: 365,
		durationDays: 365,
		tier: 'Premium',
		description: 'Annual VIP membership with exclusive benefits',
		features: ['All premium features', 'Video calls', 'Live streaming', 'VIP access', 'Priority support', 'Exclusive content'],
		active: true,
		wompiPaymentLink: 'https://checkout.nequi.wompi.co/l/hakdMS',
	},
	LIFETIME_PASS: {
		id: 'lifetime-pass',
		name: 'Lifetime Pass',
		displayName: 'Lifetime Pass',
		price: 249.99,
		priceInCOP: 249.99 * 4000,
		currency: 'USD',
		duration: 36500, // 100 years
		durationDays: 36500,
		tier: 'Premium',
		description: 'One-time payment for lifetime access',
		features: ['All premium features', 'Video calls', 'Live streaming', 'VIP access', 'Priority support', 'Exclusive content', 'Lifetime access', 'No renewal needed'],
		active: true,
		wompiPaymentLink: 'https://checkout.nequi.wompi.co/l/b04EoQ',
		isLifetime: true,
	},

	// Backwards-compatible aliases (deprecated) — map legacy keys to canonical plans
	SILVER: {
		// Deprecated alias for PNP Member (kept to avoid breaking older scripts)
		id: 'pnp-member',
		name: 'PNP Member (legacy alias: Silver)',
		displayName: 'PNP Member',
		price: 24.99,
		priceInCOP: 24.99 * 4000,
		currency: 'USD',
		duration: 30,
		durationDays: 30,
		tier: 'Basic',
		description: 'Deprecated alias for PNP Member',
		features: ['Premium channel access'],
		active: true,
		deprecated: true,
	},
	GOLDEN: {
		// Deprecated alias for PNP Crystal Member
		id: 'crystal-member',
		name: 'PNP Crystal Member (legacy alias: Golden)',
		displayName: 'PNP Crystal Member',
		price: 49.99,
		priceInCOP: 49.99 * 4000,
		currency: 'USD',
		duration: 120,
		durationDays: 120,
		tier: 'Premium',
		description: 'Deprecated alias for PNP Crystal Member',
		features: ['All premium features'],
		active: true,
		deprecated: true,
	},
};

module.exports = plans;
