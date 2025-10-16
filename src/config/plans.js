const plans = {
  "SILVER": {
    "name": "PNPtv Silver",
    "displayName": "Silver",
    "price": 15, // USD for display
    "priceInCOP": 60000, // Colombian Pesos (approx $15 USD)
    "currency": "COP",
    "duration": 30, // days
    "durationDays": 30,
    "description": "Ad-free experience with daily swipe allowance and verification badge.",
    "tier": "Silver",
    "features": [
      "Ad-free experience",
      "Daily swipe allowance",
      "Verification badge",
      "Priority listings"
    ]
  },
  "GOLDEN": {
    "name": "PNPtv Golden",
    "displayName": "Golden",
    "price": 25, // USD for display
    "priceInCOP": 100000, // Colombian Pesos (approx $25 USD)
    "currency": "COP",
    "duration": 30, // days
    "durationDays": 30,
    "description": "All Silver perks plus VIP channels, exclusive badges, priority support, and crypto bonus.",
    "tier": "Golden",
    "cryptoBonus": "5 USDT",
    "features": [
      "All Silver features",
      "VIP channels access",
      "Exclusive golden badge",
      "Priority support",
      "5 USDT crypto bonus"
    ]
  },
  // Alias for backward compatibility
  "silver": {
    "name": "PNPtv Silver",
    "displayName": "Silver",
    "price": 15,
    "priceInCOP": 60000,
    "currency": "COP",
    "duration": 30,
    "durationDays": 30,
    "description": "Ad-free experience with daily swipe allowance and verification badge.",
    "tier": "Silver",
    "features": [
      "Ad-free experience",
      "Daily swipe allowance",
      "Verification badge",
      "Priority listings"
    ]
  },
  "golden": {
    "name": "PNPtv Golden",
    "displayName": "Golden",
    "price": 25,
    "priceInCOP": 100000,
    "currency": "COP",
    "duration": 30,
    "durationDays": 30,
    "description": "All Silver perks plus VIP channels, exclusive badges, priority support, and crypto bonus.",
    "tier": "Golden",
    "cryptoBonus": "5 USDT",
    "features": [
      "All Silver features",
      "VIP channels access",
      "Exclusive golden badge",
      "Priority support",
      "5 USDT crypto bonus"
    ]
  }
};

module.exports = plans;
