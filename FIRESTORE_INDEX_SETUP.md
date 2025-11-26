# Firestore Index Setup Guide

## Issue
The bot requires Firestore composite indexes to run membership expiration queries efficiently.

## Quick Fix - Use Firebase Console Links

Firebase has already generated the index creation links for you. Click these links to create the required indexes:

### Index 1: Membership Expiration Query
**Purpose:** Used for checking expired memberships

Click this link to create it:
https://console.firebase.google.com/v1/r/project/pnptv-b8af8/firestore/indexes?create_composite=Cklwcm9qZWN0cy9wbnB0di1iOGFmOC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvdXNlcnMvaW5kZXhlcy9fEAEaCAoEdGllchABGhcKE21lbWJlcnNoaXBFeHBpcmVzQXQQARoMCghfX25hbWVfXxAB

**What it does:**
- Allows querying users by tier AND membershipExpiresAt
- Used by: Expiration check, Expiring memberships list

## Manual Setup (Alternative)

If the link above does not work, follow these steps:

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select project: **pnptv-b8af8**
3. Click "Firestore Database" in left menu
4. Click "Indexes" tab
5. Click "Create Index"
6. Configure as follows:

### Index Configuration:

**Collection:** users
**Fields to index:**
- Field: tier | Order: Ascending
- Field: membershipExpiresAt | Order: Ascending

**Query scope:** Collection

7. Click "Create"
8. Wait 5-10 minutes for index to build

## Verification

After creating the index:

1. Restart your bot
2. Try the "🔄 Expire Check" button in admin panel
3. Try the "⏰ Expiring Soon" button
4. Both should work without errors

## Other Required Indexes

The following single-field indexes may also be needed (Firebase usually creates these automatically):

- **users.createdAt** (Descending) - For listing users by join date
- **users.tierUpdatedAt** (Descending) - For sorting by tier update time

These are usually auto-created when you first run queries, but if you see errors, create them manually.

## Troubleshooting

### Index Still Not Working
- Wait 5-10 minutes after creation
- Check index status in Firebase Console (should show "Enabled")
- Restart bot after index is enabled

### Multiple Index Errors
- Click each link Firebase provides in the error message
- Create all required indexes
- They can build in parallel

### Index Building Takes Too Long
- Normal for large collections
- Can take up to 30 minutes for thousands of documents
- Bot will work once index shows "Enabled"

## Using Firebase CLI (Advanced)

If you have Firebase CLI installed:

```bash
# Deploy indexes from firestore.indexes.json
firebase deploy --only firestore:indexes

# Or use firebase tools
firebase firestore:indexes
```

## Prevention

The `firestore.indexes.json` file in this project documents all required indexes. 
Keep it updated as you add new queries.

---

**Note:** Indexes are free and do not count against your Firestore quota.

