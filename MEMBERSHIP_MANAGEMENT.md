# Membership Management System

## Overview

The bot now includes a comprehensive membership management system with automatic expiration tracking and admin tools for manual activation.

## Features Added

### 1. Automatic Membership Expiration

- **Scheduled Checks**: The system runs automatic checks to expire memberships:
  - Daily at 2:00 AM
  - Backup check every 6 hours
- **Automatic Downgrade**: Users with expired memberships are automatically moved to Free tier
- **User Notifications**: Users receive a notification when their membership expires

### 2. Manual Membership Activation (Admin)

Admins can now manually activate memberships with custom durations:

- **Access**: `/admin` → User Management → Search/Select User → Edit Tier
- **Options**:
  - Free (no expiration)
  - Silver: 30, 60, or 90 days
  - Golden: 30, 60, or 90 days
- **User Notification**: User receives a notification with expiration date
- **Database Update**: Expiration date is automatically calculated and stored

### 3. Expiring Memberships View (Admin)

- **Access**: `/admin` → "⏰ Expiring Soon"
- **Shows**: All memberships expiring within the next 7 days
- **Information Displayed**:
  - Username
  - User ID
  - Current tier
  - Expiration date
  - Days remaining

### 4. Manual Expiration Check (Admin)

- **Access**: `/admin` → "🔄 Expire Check"
- **Function**: Manually trigger the expiration check process
- **Results**: Shows number of memberships checked, expired, and any errors
- **Use Case**: Run immediately after manual changes or to verify system status

## Database Schema Updates

New fields added to the `users` collection:

```javascript
{
  // ... existing fields ...

  // Membership expiration
  membershipExpiresAt: Timestamp | null,  // When membership expires (null for Free/Lifetime)
  membershipExpiredAt: Timestamp | null,  // When membership was expired by system
  previousTier: String,                   // Previous tier before expiration

  // Existing fields updated
  tierUpdatedAt: Timestamp,               // When tier was last changed
  tierUpdatedBy: String,                  // Who changed it (admin, payment, system)
}
```

## Admin Features

### Admin Panel Updates

The admin panel now includes:
- **⏰ Expiring Soon**: View memberships expiring in next 7 days
- **🔄 Expire Check**: Manually run expiration check
- **Enhanced User Details**: Shows expiration dates in user profiles

### User Details Enhanced

When viewing a user, admins now see:
- Membership expiration date (if applicable)
- Days remaining until expiration
- Expired status if membership has lapsed

## API / Functions

### membershipManager.js

```javascript
// Activate membership with expiration
activateMembership(userId, tier, activatedBy, durationDays)

// Check and expire all due memberships
checkAndExpireMemberships()

// Get membership info for a user
getMembershipInfo(userId)

// Get users with expiring memberships
getExpiringMemberships(daysThreshold)
```

### scheduler.js

```javascript
// Initialize all scheduled tasks
initializeScheduler(bot)

// Manually run expiration check
runManualExpirationCheck()
```

## Usage Examples

### Admin: Manually Activate Membership

1. Open admin panel: `/admin`
2. Click "👥 User Management"
3. Click "🔍 Search User" or "📋 List All"
4. Select the user
5. Click "✏️ Edit Tier"
6. Choose tier and duration (e.g., "🥇 Golden (60 days)")
7. User receives notification with expiration date

### Admin: View Expiring Memberships

1. Open admin panel: `/admin`
2. Click "⏰ Expiring Soon"
3. View list of users with memberships expiring in next 7 days
4. Click "🔄 Refresh" to update the list

### Admin: Manual Expiration Check

1. Open admin panel: `/admin`
2. Click "🔄 Expire Check"
3. System checks all memberships and expires due ones
4. View results showing checked/expired/failed counts

## Automation

### Scheduled Tasks

The system automatically:
- Checks for expired memberships daily at 2:00 AM
- Runs backup checks every 6 hours
- Downgrades expired users to Free tier
- Sends notifications to expired users
- Logs all operations

### Cron Schedule

```javascript
// Daily expiration check at 2:00 AM
"0 2 * * *"

// Backup check every 6 hours
"0 */6 * * *"
```

## Benefits

### For Admins

1. **Manual Control**: Activate memberships for any user without payment processing
2. **Custom Durations**: Set any duration (30, 60, 90 days or custom)
3. **Visibility**: See which memberships are expiring soon
4. **Monitoring**: Manual expiration checks for system verification
5. **Compliance**: Database is always up-to-date with current membership status

### For Users

1. **Automatic Management**: Memberships expire automatically
2. **Notifications**: Users are notified when membership expires
3. **Transparency**: Can see their expiration date
4. **Fair System**: No forgotten renewals or billing issues

### For System

1. **Automated**: No manual intervention needed
2. **Reliable**: Multiple backup checks ensure no missed expirations
3. **Auditable**: All changes logged with timestamps
4. **Scalable**: Works with any number of users

## Migration Notes

### Existing Users

- Users with current Silver/Golden tiers without expiration dates will need admin to manually set them
- Or they will be treated as lifetime memberships until manually updated
- Free tier users are unaffected

### Recommended Actions After Deployment

1. Run manual expiration check: `/admin` → "🔄 Expire Check"
2. Review expiring memberships: `/admin` → "⏰ Expiring Soon"
3. For existing premium users, manually set expiration dates as needed

## Technical Details

### Dependencies

- **node-cron**: For scheduled task execution
- **firebase-admin**: Database operations
- **telegraf**: Bot notifications

### Files Modified/Created

**New Files:**
- `src/utils/membershipManager.js` - Core membership logic
- `src/services/scheduler.js` - Scheduled task management
- `MEMBERSHIP_MANAGEMENT.md` - This documentation

**Modified Files:**
- `src/bot/handlers/admin.js` - Admin UI updates
- `src/config/menus.js` - Admin menu updates
- `start-bot.js` - Scheduler initialization
- `package.json` - Added node-cron dependency

### Logging

All operations are logged:
- Membership activations
- Expiration checks
- User notifications
- Errors and failures

Check logs for audit trail and troubleshooting.

## Troubleshooting

### Issue: Scheduler not starting

**Solution**: Check console output for scheduler initialization message. Verify node-cron is installed.

### Issue: Expired memberships not downgrading

**Solution**:
1. Check scheduler is running
2. Run manual expiration check
3. Check logs for errors

### Issue: User not notified about expiration

**Solution**:
1. Check if user has blocked the bot
2. Verify user's language setting
3. Check logs for notification failures

## Future Enhancements

Potential improvements:
- Email notifications for expiring memberships
- Grace period before downgrade
- Automatic renewal via payment integration
- Membership extension without full reset
- Analytics dashboard for membership trends
- CSV export of membership data
