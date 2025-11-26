# Admin Features - Manual Testing Checklist
**Tester:** Admin User (ID: 8365312597)  
**Date:** November 1, 2025  
**Bot PID:** 306504  

---

## ✅ ADMIN ACCESS

- [ ] Send `/admin` command
- [ ] **Expected:** Admin Panel menu appears with options
- [ ] **Verify:** Menu shows: Stats, Users, Broadcast, Plans, Memberships, etc.

---

## 📊 STATISTICS DASHBOARD

- [ ] Click "📊 Statistics" in admin panel
- [ ] **Expected:** Loading message appears, then stats dashboard
- [ ] **Verify:**
  - [ ] Total users count displayed (expect 45)
  - [ ] Free vs Premium breakdown
  - [ ] Active today / Active this week metrics
  - [ ] User photos, locations, onboarding percentages
  - [ ] Revenue estimate

---

## 👥 USER MANAGEMENT

### List All Users
- [ ] Click "👥 Users" → "📋 All Users"
- [ ] **Expected:** Paginated list (10 per page)
- [ ] **Verify:**
  - [ ] Page navigation buttons work (Next/Previous)
  - [ ] User IDs display correctly
  - [ ] Click on user shows detailed profile

### Search Users
- [ ] Click "🔍 Search User"
- [ ] **Expected:** Prompt for search query
- [ ] Enter a user ID or username
- [ ] **Verify:**
  - [ ] User found or "not found" message
  - [ ] Detailed profile shows if found

### View User Details
- [ ] Click on any user from list
- [ ] **Expected:** User profile card with:
  - [ ] Username, first name, language
  - [ ] Registration date
  - [ ] Current tier and expiration
  - [ ] Edit/Ban/Message buttons

### List Premium Users
- [ ] Click "💎 Premium Users"
- [ ] **Expected:** Only users with active subscriptions
- [ ] **Verify:** Count is reasonable (subset of 45 total)

### List New Users
- [ ] Click "🆕 New Users"
- [ ] **Expected:** Recently registered users
- [ ] **Verify:** Sorted by registration date

---

## 💳 TIER MANAGEMENT

### Edit User Tier
- [ ] From user details, click "✏️ Edit Tier"
- [ ] **Expected:** 5 tier options appear:
  - [ ] ⏱️ Trial Week (7 days)
  - [ ] ⭐ PNP Member (30 days)
  - [ ] 💎 PNP Crystal (120 days)
  - [ ] 👑 PNP Diamond (365 days)
  - [ ] ⚪ Free (no expiration)
- [ ] Select "PNP Member (30d)"
- [ ] **Expected:** Confirmation message showing:
  - [ ] User ID
  - [ ] New tier: pnp-member
  - [ ] Expiration date (30 days from now)
- [ ] **Verify:** User receives Telegram notification with activation details

---

## 💳 MEMBERSHIP MANAGEMENT

### Manual Membership Activation
- [ ] Click "➕ Activate Member"
- [ ] **Expected:** Prompt for user ID
- [ ] Enter a valid user ID
- [ ] **Expected:** Quick activation menu with tier options
- [ ] Select a tier (e.g., Crystal - 120d)
- [ ] **Expected:** Success message showing:
  - [ ] User ID
  - [ ] Tier
  - [ ] Duration (120 days)
  - [ ] Expiration date
- [ ] **Verify:** User gets notification with invite link

### Extend Membership
- [ ] Click "⏱️ Extend Member"
- [ ] **Expected:** Prompt for user ID
- [ ] Enter user ID with active membership
- [ ] **Expected:** Options:
  - [ ] +7 days
  - [ ] +30 days
  - [ ] +90 days
  - [ ] Custom days
- [ ] Select "+30 days"
- [ ] **Expected:** Confirmation with new expiration date

### Custom Extension
- [ ] Click "⏱️ Extend Member" → Custom days
- [ ] Enter: `45`
- [ ] **Expected:** Membership extended by 45 days

### Update Member
- [ ] Click "🔄 Update Member"
- [ ] Enter user ID
- [ ] **Expected:** Current tier shown, option to change
- [ ] Select new tier
- [ ] **Verify:** Tier updated while keeping expiration

### Modify Expiration
- [ ] Click "📅 Modify Expiration"
- [ ] Enter user ID
- [ ] Enter new date (e.g., `2025-12-31`)
- [ ] **Expected:** Expiration date updated to exactly that date

### Show Expiring (7 days)
- [ ] Click "⏰ Expiring Soon"
- [ ] **Expected:** List of users expiring in next 7 days
- [ ] Each shows: username, ID, expiration date, days remaining

### Run Expiration Check
- [ ] Click "🔄 Expiration Check"
- [ ] **Expected:** Process runs, shows results:
  - [ ] Users notified
  - [ ] Auto-downgrades applied
  - [ ] Logs recorded

---

## 📢 BROADCAST

### Simple Broadcast
- [ ] Click "📢 Broadcast"
- [ ] **Expected:** Wizard starts
  
**Step 1: Filter**
- [ ] Choose target (All / Premium / New / Active)
- [ ] **Verify:** Selection accepted

**Step 2: Media (Optional)**
- [ ] Click "Media" to add photo/video
  - [ ] Upload from device
  - [ ] **Verify:** File accepted and displays
- [ ] Skip media if not needed

**Step 3: Message**
- [ ] Click "Message"
- [ ] Type: `Hello from admin! 🎉`
- [ ] **Verify:** Text accepted

**Step 4: Buttons (Optional)**
- [ ] Click "Buttons" to add inline links
- [ ] Add button: `"Visit Website|https://example.com"`
- [ ] **Verify:** Button added

**Step 5: Preview**
- [ ] Click "Preview"
- [ ] **Expected:** Message rendered with media and buttons
- [ ] **Verify:** Looks correct

**Step 6: Send**
- [ ] Click "✅ Send"
- [ ] **Expected:** Progress shown, then success message with count
- [ ] **Verify:** Admin receives confirmation with send count

### Test Broadcast
- [ ] During wizard, click "🧪 Test"
- [ ] **Expected:** Message sent only to admin as `[TEST MESSAGE]`
- [ ] **Verify:** Admin receives test copy

### Broadcast to Specific Filter
- [ ] Send broadcast to "Premium Users"
- [ ] **Verify:** Only premium users receive it
- [ ] Check logs for correct count

---

## 📅 SCHEDULED BROADCASTS

### Create Scheduled Broadcast
- [ ] Click "📅 Scheduled Broadcasts"
- [ ] Click "➕ Schedule New"
- [ ] Follow broadcast wizard (Steps 1-4 same as above)
- [ ] **Step 5: Date/Time**
  - [ ] Enter date: `2025-11-02`
  - [ ] Enter time: `15:30`
  - [ ] **Verify:** Accepted and parsed

**Step 6: Confirm & Save**
- [ ] Review details
- [ ] Click "💾 Save"
- [ ] **Expected:** Success message with broadcast ID
- [ ] **Verify:** Message scheduled in Firestore

### View Scheduled Broadcasts
- [ ] Click "📅 Scheduled Broadcasts"
- [ ] **Expected:** List of all scheduled broadcasts
- [ ] Shows: date, time, recipients count, status

### Cancel Scheduled
- [ ] From scheduled list, click "🗑️ Cancel" on one
- [ ] **Expected:** Confirmation
- [ ] **Verify:** Removed from list

---

## 📊 PLAN MANAGEMENT

### View Plans
- [ ] Click "💎 Plans"
- [ ] **Expected:** 5 plans listed:
  - [ ] Trial Week (7d)
  - [ ] PNP Member (30d)
  - [ ] PNP Crystal (120d)
  - [ ] PNP Diamond (365d)
  - [ ] Free

### Plan Details
- [ ] Click on "PNP Member"
- [ ] **Expected:** Shows:
  - [ ] Plan name, tier ID
  - [ ] Price ($24.99)
  - [ ] Duration (30 days)
  - [ ] Description
  - [ ] Edit buttons for each field

### Edit Plan Field
- [ ] Click "Edit Price"
- [ ] Change from `24.99` to `29.99`
- [ ] **Expected:** Value updated in Firestore
- [ ] **Verify:** Changes reflect in payments

### Plan Statistics
- [ ] Click "📈 Plan Stats"
- [ ] **Expected:** Chart/table showing:
  - [ ] Subscribers per plan
  - [ ] Revenue per plan
  - [ ] Total active subscriptions

---

## 🎨 MENU MANAGEMENT

### Configure Menus
- [ ] Click "⚙️ Menu Config"
- [ ] **Expected:** List of menus:
  - [ ] Main Menu
  - [ ] Admin Menu
  - [ ] Subscription Menu
  - [ ] Help Menu
  - [ ] Settings Menu

### View Menu Details
- [ ] Click on "Main Menu"
- [ ] **Expected:** Shows:
  - [ ] All buttons in menu
  - [ ] Button texts and callbacks
  - [ ] Layout structure

### Test Menu
- [ ] Click "🧪 Test Menu"
- [ ] **Expected:** Menu rendered as users see it
- [ ] **Verify:** All buttons clickable

### Reload Menus
- [ ] Click "🔄 Reload Menus"
- [ ] **Expected:** Cache refreshed
- [ ] **Verify:** Changes take effect

---

## 🚫 USER ACTIONS

### Message User
- [ ] Select user from list
- [ ] Click "💬 Message"
- [ ] Type: `Hello! How can we help?`
- [ ] **Expected:** User receives message
- [ ] **Verify:** Message appears in user's chat

### Ban User
- [ ] Select user
- [ ] Click "🚫 Ban"
- [ ] **Expected:** Confirmation dialog
- [ ] Click "Yes"
- [ ] **Expected:** User banned, blocked from /start
- [ ] **Verify:** Banned user sees "Access denied" message

### Unban User
- [ ] From user details (if showing banned user)
- [ ] Click "✅ Unban"
- [ ] **Expected:** User restored
- [ ] **Verify:** User can access bot again

---

## 🛡️ SECURITY & CALLBACKS

### Callback Data Parsing
- [ ] Test admin_tier callback:
  - [ ] Format: `admin_tier:pnp-member:30:123456`
  - [ ] **Verify:** Correctly parsed into tier, duration, userId

- [ ] Test legacy callback:
  - [ ] Format: `admin_set_tier_123456_pnp-member_30`
  - [ ] **Verify:** Still works with backward compatibility

### Error Handling
- [ ] Try invalid user ID
  - [ ] **Expected:** "User not found" message
- [ ] Try invalid date format
  - [ ] **Expected:** "Invalid date" message
- [ ] Try out-of-range tier
  - [ ] **Expected:** Appropriate error

---

## 🌐 BILINGUAL SUPPORT

### English Mode
- [ ] Verify all admin messages in English
- [ ] Check special characters render correctly
- [ ] Check emoji display

### Spanish Mode
- [ ] Change language to Spanish
- [ ] Access admin panel
- [ ] **Verify:** All messages in Spanish
- [ ] Check accents and special chars

---

## 📝 ADMIN LOGS

### Verify Logging
- [ ] Execute several admin actions
- [ ] Check: `pm2 logs 32` (bot PID)
- [ ] **Expected:** Admin actions logged:
  - [ ] "Admin 8365312597 accessed admin panel"
  - [ ] "Admin 8365312597 activated..."
  - [ ] "Admin 8365312597 sent broadcast..."

---

## 🔍 PERFORMANCE CHECK

- [ ] Load stats dashboard
  - [ ] **Verify:** Loads in < 5 seconds with 45 users
- [ ] View all users (paginated)
  - [ ] **Verify:** Pagination smooth, no lag
- [ ] Send broadcast to all
  - [ ] **Verify:** Completes without timeout
  - [ ] **Verify:** All 45 users receive message

---

## ✨ FINAL VERIFICATION

- [ ] All 50+ admin functions accessible
- [ ] No console errors
- [ ] No Firestore permission errors
- [ ] All bilingual strings render correctly
- [ ] Admin user (8365312597) can perform all actions
- [ ] Non-admin users cannot access `/admin`
- [ ] Logs record all admin activity

---

## 🎯 TEST RESULTS

| Feature | Status | Issues |
|---------|--------|--------|
| Admin Access | ⭕ | |
| Statistics | ⭕ | |
| User List | ⭕ | |
| User Search | ⭕ | |
| Tier Management | ⭕ | |
| Membership Activation | ⭕ | |
| Membership Extension | ⭕ | |
| Broadcast | ⭕ | |
| Scheduled Broadcast | ⭕ | |
| Plan Management | ⭕ | |
| Menu Configuration | ⭕ | |
| User Banning | ⭕ | |
| Messages | ⭕ | |
| Error Handling | ⭕ | |
| Bilingual | ⭕ | |
| Logging | ⭕ | |
| Performance | ⭕ | |

---

**Instructions:**
1. Fill in status: ✅ (pass) or ❌ (fail)
2. Note any issues in the Issues column
3. Re-test failed items
4. Document blockers below

---

## 📌 NOTES & BLOCKERS

_(Fill in after testing)_

```
[Add any blockers or notes here]
```

---

**Test Date:** ___________  
**Tester:** ___________  
**Sign-off:** ___________  
