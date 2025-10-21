# Plan Management System

This document describes the comprehensive plan management system for creating, modifying, and deleting subscription plans.

## Overview

The plan management system has been upgraded with full CRUD (Create, Read, Update, Delete) capabilities accessible via:
1. **Telegram Bot Admin Interface** - For managing plans directly through the bot
2. **Web Admin API** - RESTful API endpoints for programmatic access
3. **Web Admin Dashboard** - Browser-based interface for visual plan management

## Features

### Core Capabilities
- ✅ Create new subscription plans
- ✅ Update existing plans (price, duration, features, etc.)
- ✅ Soft delete plans (deactivate)
- ✅ Hard delete plans (permanent removal)
- ✅ Reactivate deactivated plans
- ✅ View plan statistics (subscribers, revenue)
- ✅ Input validation
- ✅ Firestore database integration
- ✅ Admin authentication and authorization

## Architecture

### Service Layer
**File:** `src/services/planService.js`

The PlanService provides all plan management operations:

#### Methods

| Method | Description |
|--------|-------------|
| `createPlan(data)` | Create a new plan with validation |
| `getAllPlans()` | Get all plans (including inactive) |
| `getActivePlans()` | Get only active plans |
| `listPlans()` | Alias for getActivePlans() |
| `getPlanById(id)` | Get a plan by Firestore document ID |
| `getPlanBySlug(slug)` | Get a plan by tier name or slug |
| `getPlanByName(name)` | Get a plan by exact name match |
| `updatePlan(id, updates)` | Update a plan with validation |
| `deletePlan(id)` | Soft delete (deactivate) a plan |
| `hardDeletePlan(id)` | Permanently delete a plan |
| `getPlanStats()` | Get subscriber and revenue statistics |
| `validatePlanData(data)` | Validate plan data structure |

#### Example Usage

```javascript
const planService = require('./services/planService');

// Create a new plan
const newPlan = await planService.createPlan({
  name: 'Trial Pass',
  displayName: 'Trial Pass',
  price: 14.99,
  priceInCOP: 59960,
  currency: 'USD',
  duration: 7,
  features: [
    'Ad-free experience',
    'Basic premium access',
    'Standard support',
    '7 days full access'
  ],
  tier: 'Trial',
  description: 'Try premium features for a week',
  icon: '🎫',
  cryptoBonus: null,
  recommended: false
});

// Update a plan
await planService.updatePlan(planId, {
  price: 45,
  priceInCOP: 180000
});

// Get active plans
const plans = await planService.getActivePlans();

// Delete a plan (soft)
await planService.deletePlan(planId);
```

### Validation

The service includes comprehensive validation:
- ✅ Required fields check (name, price, duration, features, tier)
- ✅ Data type validation
- ✅ Price must be non-negative number
- ✅ Duration must be positive integer
- ✅ Features must be non-empty array
- ✅ Duplicate plan name detection

## API Endpoints

### Web Admin API
**Base URL:** `/api/admin`

All endpoints require authentication via Telegram WebApp initData and admin privileges.

#### Authentication
Include the `x-telegram-init-data` header with your Telegram WebApp initData:

```javascript
headers: {
  'x-telegram-init-data': window.Telegram.WebApp.initData
}
```

Admin IDs are configured in the `ADMIN_IDS` environment variable.

#### Endpoints

##### GET /api/admin/plans
Get all plans (including inactive)

**Response:**
```json
{
  "success": true,
  "plans": [...],
  "count": 3
}
```

##### GET /api/admin/plans/stats
Get plan statistics

**Response:**
```json
{
  "success": true,
  "stats": {
    "PNP": {
      "planId": "abc123",
      "planName": "PNP Member",
      "price": 24.99,
      "priceInCOP": 99960,
      "activeSubscribers": 45,
      "expiredSubscribers": 10,
      "totalRevenue": 1124.55,
      "estimatedMonthlyRevenue": 1124.55
    }
  }
}
```

##### GET /api/admin/plans/:id
Get a specific plan

**Response:**
```json
{
  "success": true,
  "plan": {
    "id": "abc123",
    "name": "PNP Member",
    "tier": "PNP",
    "price": 24.99,
    ...
  }
}
```

##### POST /api/admin/plans
Create a new plan

**Request Body:**
```json
{
  "name": "Diamond Member",
  "displayName": "Diamond Member",
  "tier": "Diamond",
  "price": 99.99,
  "priceInCOP": 399960,
  "currency": "USD",
  "duration": 365,
  "features": [
    "Everything in Crystal Member",
    "VIP channel access",
    "Diamond member badge",
    "VIP support",
    "365 days access (1 year)",
    "Exclusive events access",
    "Special crypto bonuses",
    "Early feature access"
  ],
  "description": "Ultimate premium experience for a full year",
  "icon": "💎",
  "cryptoBonus": "10 USDT yearly bonus",
  "recommended": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Plan created successfully",
  "plan": { ... }
}
```

##### PUT /api/admin/plans/:id
Update an existing plan

**Request Body:**
```json
{
  "price": 45,
  "priceInCOP": 180000,
  "duration": 60
}
```

**Response:**
```json
{
  "success": true,
  "message": "Plan updated successfully",
  "plan": { ... }
}
```

##### DELETE /api/admin/plans/:id
Soft delete a plan (deactivate)

**Query Parameters:**
- `permanent=true` - For permanent deletion (optional)

**Response:**
```json
{
  "success": true,
  "message": "Plan deactivated successfully"
}
```

##### POST /api/admin/plans/:id/activate
Reactivate a deactivated plan

**Response:**
```json
{
  "success": true,
  "message": "Plan reactivated successfully",
  "plan": { ... }
}
```

## Web Admin Dashboard

### Access
Navigate to: `http://your-domain.com/admin-plans.html`

**Note:** You must be authenticated as an admin user through Telegram WebApp.

### Features

#### Plan Overview
- View all plans in a grid layout
- See plan status (Active/Inactive)
- Display pricing, duration, and features
- View subscriber statistics

#### Create Plan
1. Click "Create New Plan" button
2. Fill in the form:
   - Plan Name (required)
   - Display Name
   - Tier (required)
   - Price USD (required)
   - Price COP
   - Duration in days (required)
   - Description
   - Features (one per line, required)
   - Icon emoji
   - Crypto Bonus
   - Recommended checkbox
3. Click "Save Plan"

#### Edit Plan
1. Click "Edit" button on any plan card
2. Modify fields in the form
3. Click "Save Plan"

#### Deactivate/Activate Plan
- Click "Deactivate" to soft delete (can be reactivated)
- Click "Activate" to reactivate an inactive plan

#### Delete Plan
- Click "Delete" to permanently remove the plan
- Confirm the deletion

## Telegram Bot Admin Interface

### Access
Admins can access plan management through the bot with the `/admin` command.

### Navigation
1. Send `/admin` to the bot
2. Select "💰 Manage Plans"
3. Choose from options:
   - 🎫 View Trial Pass
   - 💎 View PNP Member
   - 💠 View Crystal Member
   - 💎 View Diamond Member
   - ✏️ Edit Plans
   - 📊 Statistics

### Editing Plans

#### Fields You Can Edit
- 💵 USD Price
- 💵 COP Price
- ⏱️ Duration (days)
- 💎 Crypto Bonus (Golden only)
- 📝 Description
- ✨ Features

#### Edit Flow
1. Select a plan to edit
2. Choose the field to modify
3. Send the new value
4. Changes are saved to Firestore automatically

#### Example: Update Price
```
Admin: Select "Edit PNP Member" > "USD Price"
Bot: Current USD Price: $24.99
     Send the new price in USD (example: 29.99):
Admin: 27.99
Bot: ✅ PNP Member Plan Updated
     💵 USD Price updated to: $27.99
     ✨ Changes have been saved to Firestore.
```

## Database Structure

### Firestore Collection: `plans`

```javascript
{
  id: "auto-generated-id",
  name: "PNP Member",
  displayName: "PNP Member",
  tier: "PNP",
  price: 24.99,
  priceInCOP: 99960,
  currency: "USD",
  duration: 30,
  durationDays: 30,
  features: [
    "Ad-free experience",
    "Full premium access",
    "Priority support",
    "30 days access",
    "Member badge"
  ],
  description: "Full premium access for a month",
  icon: "💎",
  cryptoBonus: null,
  recommended: true,
  active: true,
  createdAt: 1234567890,
  updatedAt: 1234567890
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Full plan name |
| `displayName` | string | No | Short display name |
| `tier` | string | Yes | Plan tier identifier |
| `price` | number | Yes | Price in USD |
| `priceInCOP` | number | No | Price in Colombian Pesos |
| `currency` | string | No | Currency code (default: "COP") |
| `duration` | number | Yes | Duration in days |
| `durationDays` | number | Yes | Same as duration (for compatibility) |
| `features` | array | Yes | List of feature strings |
| `description` | string | No | Plan description |
| `icon` | string | No | Emoji icon |
| `cryptoBonus` | string | No | Crypto bonus description |
| `recommended` | boolean | No | Is this a recommended plan? |
| `active` | boolean | Yes | Is the plan active? |
| `createdAt` | timestamp | Yes | Creation timestamp |
| `updatedAt` | timestamp | Yes | Last update timestamp |

## Migration from File-Based to Firestore

The system now uses Firestore instead of the static `config/plans.js` file. The service includes fallback logic:

1. **Primary:** Query Firestore database
2. **Fallback:** If Firestore is empty, return static plans from config

### Migration Steps

To migrate existing plans from the config file to Firestore:

```javascript
// Use the initialization script to create default plans
// Run: npm run init:plans
// This will create Trial Pass, PNP Member, Crystal Member, and Diamond Member plans
// See scripts/initializePlans.js for the default plan definitions
```

## Security

### Admin Authentication

Admin access is controlled via:
1. **Environment Variable:** `ADMIN_IDS` - Comma-separated list of Telegram user IDs
2. **Middleware:** `requireAdmin` - Validates user is admin
3. **Telegram Auth:** All requests must include valid Telegram WebApp initData

### Example Configuration

```env
ADMIN_IDS=123456789,987654321
```

### Middleware Usage

```javascript
const { authenticateTelegramUser, requireAdmin } = require('./middleware/auth');

// Protected admin route
router.use(authenticateTelegramUser);
router.use(requireAdmin);
```

## Error Handling

### API Error Responses

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common Error Codes

| Status | Meaning | Example |
|--------|---------|---------|
| 400 | Bad Request | Invalid plan data, missing required fields |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | User is not an admin |
| 404 | Not Found | Plan ID doesn't exist |
| 409 | Conflict | Plan name already exists |
| 500 | Server Error | Database or internal error |

## Testing

### Test the API

```bash
# Get all plans (requires admin auth)
curl -X GET http://localhost:3000/api/admin/plans \
  -H "x-telegram-init-data: YOUR_INIT_DATA"

# Create a plan
curl -X POST http://localhost:3000/api/admin/plans \
  -H "Content-Type: application/json" \
  -H "x-telegram-init-data: YOUR_INIT_DATA" \
  -d '{
    "name": "Test Plan",
    "tier": "Test",
    "price": 10,
    "duration": 30,
    "features": ["Feature 1", "Feature 2"]
  }'
```

### Test in Telegram Bot

1. Send `/admin` to your bot
2. Navigate to "Manage Plans"
3. Try viewing, editing, and updating plans

### Test Web Dashboard

1. Open `http://localhost:3000/admin-plans.html`
2. Authenticate via Telegram
3. Try creating, editing, and deleting plans

## Troubleshooting

### Common Issues

#### "Plan not found" when editing
- Plans must exist in Firestore database
- Ensure the plan exists in Firestore (check via /admin in bot)
- Check the plan ID matches
- Run scripts/initializePlans.js to create default plans if needed

#### "Authentication required"
- Verify `x-telegram-init-data` header is set
- Check Telegram WebApp is properly initialized
- Ensure TELEGRAM_TOKEN is configured

#### "Forbidden. Admin access required"
- Verify your user ID is in the ADMIN_IDS environment variable
- Check the environment variable is loaded correctly
- Restart the server after changing ADMIN_IDS

#### Changes not persisting
- Verify Firebase configuration is correct
- Check Firestore rules allow writes
- Look for errors in server logs

## Future Enhancements

Potential improvements for the plan management system:

- [ ] Plan templates/presets
- [ ] A/B testing support
- [ ] Discount codes and promotions
- [ ] Usage limits per tier
- [ ] Trial periods
- [ ] Plan categories
- [ ] Bulk operations
- [ ] Plan history/versioning
- [ ] Analytics dashboard
- [ ] CSV export/import

## Support

For issues or questions:
1. Check the server logs for error details
2. Verify all environment variables are set
3. Ensure Firebase is properly configured
4. Test with the debug endpoint: `/debug/test-payment`

## Related Files

- Service: [src/services/planService.js](../src/services/planService.js)
- API Routes: [src/web/routes/admin.js](../src/web/routes/admin.js)
- Middleware: [src/web/middleware/auth.js](../src/web/middleware/auth.js)
- Bot Handler: [src/bot/handlers/admin.js](../src/bot/handlers/admin.js)
- Web Dashboard: [src/web/public/admin-plans.html](../src/web/public/admin-plans.html)
- Static Config: [src/config/plans.js](../src/config/plans.js)
