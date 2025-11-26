# Admin Features Complete Guide

## Overview

The admin panel now includes a comprehensive set of features for managing users, memberships, and the bot. This guide covers all available admin functionalities.

## Accessing Admin Panel

**Command:** `/admin`

**Access:** Only users with IDs in the `ADMIN_IDS` environment variable

## Admin Panel Layout

```
⚙️ Admin Panel
├── 👥 User Management
├── 📊 Statistics
├── ⏰ Expiring Soon
├── 🔄 Expire Check
├── 📢 Broadcast
├── 💰 Plan Management
└── 📋 Menu Config
```

## Features Overview

### 1. User Management (👥)

Access detailed user management tools.

#### Submenu Options:

**📋 List All**
- View all users with pagination (10 per page)
- Shows: Tier icon, username, photo/location status, ID, XP
- Navigate through pages
- Click on user ID to view details

**🔍 Search User**
- Search by username (without @) or user ID
- Returns detailed user profile

**🥇 Premium Users**
- List all Silver and Golden tier users
- Shows expiration dates and days remaining
- Up to 50 users displayed
- Refresh button to update list

**📅 New Users (7 days)**
- Lists users who joined in the last 7 days
- Shows how many days ago they joined
- Includes tier and XP information

---

### 2. Statistics Dashboard (📊)

Comprehensive bot statistics including:

#### User Metrics
- Total users
- Active today
- Active this week (7 days)
- Onboarding completion rate

#### Tier Distribution
- Free users count and percentage
- Silver users count and percentage
- Golden users count and percentage

#### Feature Adoption
- Users with photos (percentage)
- Users with location (percentage)
- Average XP across all users

#### Revenue Estimates
- Monthly revenue (Silver: $15, Golden: $25)
- Annual revenue projection

**Refresh:** Click "🔄 Actualizar/Refresh" button

---

### 3. User Details & Actions

When viewing a specific user, you can see:

#### User Information
- User ID (clickable)
- Username
- Current tier
- Membership expiration date (if applicable)
- Days remaining
- XP points
- Badges
- Photo status
- Location status
- Bio
- Creation date
- Last active date
- Ban status (if banned)

#### Available Actions

**✏️ Edit Tier**
- Change user to Free (no expiration)
- Activate Silver: 30, 60, or 90 days
- Activate Golden: 30, 60, or 90 days
- User receives notification with expiration date
- Database automatically updated

**🎁 Give XP**
- Award XP points to users
- Enter amount (e.g., 100)
- User receives notification
- Updates immediately in database

**💬 Message**
- Send a direct message to the user
- Message is prefixed with admin header
- User receives it in their Telegram
- Handles blocked users gracefully

**🚫 Ban / ✅ Unban**
- Ban users from using the bot
- Requires confirmation before banning
- User receives suspension notification
- Unban button appears when user is banned
- User receives reactivation notification

---

### 4. Membership Management

#### ⏰ Expiring Soon

View all memberships expiring within the next 7 days:
- Shows username, user ID, tier, expiration date
- Displays days remaining
- Color-coded warnings (⚠️ for expired)
- Refresh button to update list

#### 🔄 Expire Check

Manually trigger membership expiration check:
- Scans all premium users
- Expires memberships that have passed their expiration date
- Downgrades expired users to Free tier
- Shows results:
  - Number checked
  - Number expired
  - Number failed
- Users receive expiration notifications

**Automatic Checks:**
- Daily at 2:00 AM
- Backup check every 6 hours
- Fully automated with logging

---

### 5. Broadcast (📢)

Send messages to all users:

**Process:**
1. Click "📢 Broadcast"
2. Enter message (supports Markdown)
3. Bot sends to all users
4. Rate-limited to avoid Telegram restrictions
5. Shows results:
   - Number sent successfully
   - Number failed (blocked users, etc.)

**Features:**
- Automatic rate limiting (100ms delay every 10 users)
- Markdown support for formatting
- Failed delivery tracking
- Progress tracking

---

### 6. Plan Management (💰)

View and manage subscription plans:

**Displays:**
- Silver plan details
  - Price: $15
  - Duration: 30 days
  - Number of features
- Golden plan details
  - Price: $25
  - Crypto bonus: 5 USDT
  - Duration: 30 days
  - Number of features

**Note:** Plans are configured in `src/config/plans.js`

---

### 7. Menu Configuration (📋)

View available menus:

**Available Menus:**
- Main (main user menu)
- Profile (user profile options)
- Admin (admin panel - this menu!)
- Subscription (subscription options)

**Note:** Menus are configured in `src/config/menus.js`

---

## Workflow Examples

### Example 1: Manual Membership Activation

**Scenario:** User paid through alternative method (bank transfer, cash, etc.)

1. Access admin panel: `/admin`
2. Click "👥 User Management"
3. Click "🔍 Search User"
4. Enter user ID or username
5. User details appear
6. Click "✏️ Edit Tier"
7. Select tier and duration (e.g., "🥇 Golden (30 days)")
8. User receives notification
9. Database updated with expiration date

**Result:** User has Golden tier for 30 days

---

### Example 2: Give Bonus XP for Community Event

**Scenario:** Reward users who participated in a special event

1. Access admin panel: `/admin`
2. Click "👥 User Management"
3. Search for user
4. Click "🎁 Give XP"
5. Enter amount: `500`
6. User receives congratulations message
7. XP updated in database

**Result:** User has +500 XP

---

### Example 3: Handle Abusive User

**Scenario:** User violated community guidelines

1. Access admin panel: `/admin`
2. Click "👥 User Management"
3. Search for user
4. Click "🚫 Ban"
5. Confirm ban
6. User receives suspension notification
7. User cannot use bot features

**To Unban Later:**
1. Search for user
2. Click "✅ Unban"
3. User receives reactivation message

---

### Example 4: Monitor Expiring Memberships

**Scenario:** Check who needs to renew soon

1. Access admin panel: `/admin`
2. Click "⏰ Expiring Soon"
3. View list of users expiring in next 7 days
4. Contact users proactively to remind them
5. Or wait for automatic expiration

---

### Example 5: Run Manual Expiration Check

**Scenario:** Just made manual changes, want to verify system

1. Access admin panel: `/admin`
2. Click "🔄 Expire Check"
3. System scans all memberships
4. Expired memberships downgraded to Free
5. View results summary

---

## Database Fields Updated by Admin

### User Collection Updates

**Tier Management:**
- `tier`: User's current tier
- `tierUpdatedAt`: Timestamp of last tier change
- `tierUpdatedBy`: Who changed it (admin, payment, system)
- `membershipExpiresAt`: When membership expires
- `membershipExpiredAt`: When membership was expired
- `previousTier`: Tier before expiration

**XP Management:**
- `xp`: User's experience points
- `lastActive`: Updated when XP given

**Ban Management:**
- `banned`: Boolean indicating ban status
- `bannedAt`: When user was banned
- `bannedBy`: Admin ID who banned
- `unbannedAt`: When user was unbanned
- `unbannedBy`: Admin ID who unbanned

---

## Keyboard Shortcuts & Tips

### Navigation Tips

1. **Always Use Back Buttons:** Each screen has a "« Back" button
2. **Refresh Buttons:** Many lists have refresh buttons to update data
3. **Search vs List:** Use search for specific users, list for browsing
4. **Premium List:** Quick way to see all paying customers

### Best Practices

1. **Membership Activation:**
   - Always verify payment before activating
   - Use appropriate duration (30/60/90 days)
   - Document activations in your records

2. **Banning Users:**
   - Always review user activity first
   - Document reason for ban
   - Consider temporary bans vs permanent

3. **Broadcasting:**
   - Test message format first
   - Keep messages concise
   - Use Markdown for formatting
   - Schedule during active hours

4. **XP Awards:**
   - Set consistent amounts for rewards
   - Document why XP was awarded
   - Don't over-inflate XP economy

---

## Admin Permissions

### Required Permissions

To access admin panel:
- User ID must be in `ADMIN_IDS` environment variable
- Format: `ADMIN_IDS=123456,789012,345678`

### Security Features

- All admin actions are logged
- User notifications sent for all changes
- Failed actions don't crash the bot
- Rate limiting on broadcasts
- Confirmation required for destructive actions (ban)

---

## Troubleshooting

### Issue: Can't access admin panel

**Solution:**
1. Check if your user ID is in `ADMIN_IDS`
2. Get your ID: Start any chat with @userinfobot
3. Add your ID to .env file
4. Restart bot

### Issue: User search not working

**Solution:**
- Try user ID instead of username
- Remove @ symbol from username
- Check if user exists in database
- User must have completed onboarding

### Issue: Broadcast fails for some users

**Reason:** Users may have:
- Blocked the bot
- Deleted their Telegram account
- Privacy settings preventing messages

**This is normal** - check failed count in results

### Issue: Expiration check shows 0 expired

**Reasons:**
- No memberships have expired yet
- Automatic check already ran
- All premium users have valid memberships

**This is good!** Means system is working correctly

### Issue: Can't ban user

**Check:**
- User exists in database
- You have admin permissions
- User isn't already banned
- Database connection is active

---

## Logs & Monitoring

All admin actions are logged with:
- Admin user ID
- Action performed
- Target user (if applicable)
- Timestamp
- Results

**Log Location:** Console output and Winston logs

**Example Log Entries:**
```
[INFO] Admin 6636269 accessed admin panel
[INFO] Admin 6636269 set tier Golden for user: 123456 (30 days)
[INFO] Admin 6636269 gave 100 XP to user: 123456
[INFO] Admin 6636269 banned user: 789012
[INFO] Admin 6636269 sent broadcast to 45 users
```

---

## Future Enhancements

Potential features for future versions:

1. **Analytics Dashboard**
   - Revenue charts
   - Growth metrics
   - Engagement analytics

2. **Bulk Operations**
   - Bulk XP awards
   - Group memberships
   - Batch tier updates

3. **Advanced Search**
   - Filter by tier
   - Filter by XP range
   - Filter by activity

4. **Custom Durations**
   - Enter custom number of days
   - Lifetime memberships
   - Trial periods

5. **Payment Integration**
   - Automatic tier activation on payment
   - Payment history
   - Refund handling

6. **User Notes**
   - Add admin notes to user profiles
   - Track support interactions
   - Document issues

7. **Scheduled Actions**
   - Schedule tier changes
   - Schedule broadcasts
   - Automated campaigns

---

## API Reference

For developers extending the admin system:

### Key Functions

**User Management:**
```javascript
showUserDetails(ctx, userId, userData)
editUserTier(ctx, userId)
setUserTier(ctx, userId, tier, durationDays)
```

**XP Management:**
```javascript
giveXP(ctx, userId)
executeGiveXP(ctx, userId, amount)
```

**Messaging:**
```javascript
messageUser(ctx, userId)
executeSendMessage(ctx, userId, message)
broadcastMessage(ctx)
sendBroadcast(ctx, message)
```

**Ban Management:**
```javascript
banUser(ctx, userId)
executeBanUser(ctx, userId)
unbanUser(ctx, userId)
```

**Lists:**
```javascript
listAllUsers(ctx, page)
listPremiumUsers(ctx)
listNewUsers(ctx)
```

**Membership:**
```javascript
showExpiringMemberships(ctx)
runExpirationCheck(ctx)
```

---

## Conclusion

The admin panel provides complete control over user management, memberships, and bot operations. All actions are logged, users are notified of changes, and the system is designed to handle errors gracefully.

For support or feature requests, check the issues on GitHub or contact the development team.

**Happy Administering!** 🎉
