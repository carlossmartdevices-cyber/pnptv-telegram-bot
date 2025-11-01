// Canonical static plans fallback.
// Prefer using Firestore for plan management. This file provides a
// safe, centralized fallback for legacy code paths and for local dev.
// Keep values minimal and accurate to the current production plans.
const plans = {
	// New canonical plans
	TRIAL_WEEK: {
		id: 'trial-week',
		name: 'Trial Week',
		displayName: 'Trial Week',
		price: 14.99,
		priceInCOP: 14.99 * 4000,
		currency: 'USD',
		duration: 7,
		durationDays: 7,
		tier: 'trial-week',
		description: 'One week trial to explore premium features',
		features: ['Trial access', 'Limited premium features'],
		active: true,
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
		tier: 'pnp-member',
		description: 'Monthly membership with full access',
		features: ['Full access', '1080p streaming', 'Priority support'],
		active: true,
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
		tier: 'crystal-member',
		description: '4-month package with premium perks',
		features: ['Premium access', '4K streaming', 'Early access'],
		active: true,
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
		tier: 'diamond-member',
		description: 'Annual VIP membership with exclusive benefits',
		features: ['VIP access', 'Priority support', 'Exclusive content'],
		active: true,
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
		tier: 'pnp-member',
		description: 'Deprecated alias for PNP Member',
		features: ['Full access'],
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
		tier: 'crystal-member',
		description: 'Deprecated alias for PNP Crystal Member',
		features: ['Premium access'],
		active: true,
		deprecated: true,
	},
};

module.exports = plans;
