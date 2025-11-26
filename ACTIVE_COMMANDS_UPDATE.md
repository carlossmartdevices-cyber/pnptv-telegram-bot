# Active Commands Update - November 13, 2025

## Summary
Updated PNPtv Bot to use a focused set of 14 essential commands for members.

## Changes Made

### 1. Created Active Commands List
**File**: `COMMANDS_ACTIVE.txt`

14 Essential Commands:
```
/start          # Begin onboarding & setup profile
/help           # Show help menu with available features
/profile        # View & edit your profile
/menu           # Show main menu with quick actions
/subscribe      # Browse & purchase subscription plans
/nearby         # Find members near location (Premium only)
/aichat         # Start AI chat conversation
/endchat        # End current AI chat session
/toptracks      # View top played tracks in group
/zoomroom       # Schedule a group video call
/rules          # View community rules & guidelines
/library        # Access music library
/optout         # Stop receiving broadcast messages
/optin          # Resume receiving broadcast messages
```

### 2. Command Rename
- **Old**: `/schedulecall`
- **New**: `/zoomroom`
- **Reason**: Clearer name for Zoom room scheduling functionality
- **Backward Compatibility**: Old command still works as an alias

### 3. Disabled Commands
The following commands have been disabled (commented out):
- `/schedulestream` - Stream scheduling
- `/upcoming` - Upcoming events view
- `/playlist` - Playlist management
- `/addtrack` - Add tracks to playlist
- `/deletetrack` - Remove tracks
- `/deleteevent` - Delete events
- `/settimezone` - Timezone settings
- `/zoomstatus` - Zoom status check

These can be re-enabled by uncommenting in `src/bot/index.js` (lines 245-252)

### 4. Code Updates
**File**: `src/bot/index.js`

Changes:
- Line 244: Added `/zoomroom` command
- Line 245: Kept `/schedulecall` as legacy alias
- Lines 246-252: Commented out non-essential commands with explanatory note

## Bot Status
✅ **Restarted Successfully** at 2025-11-13 11:46:44 UTC

No errors detected. All 14 active commands are ready to use.

## Command Categories (Active)

| Category | Commands | Count |
|----------|----------|-------|
| Navigation | /start, /help, /profile, /menu | 4 |
| Subscription | /subscribe | 1 |
| Discovery | /nearby | 1 |
| AI Chat | /aichat, /endchat | 2 |
| Community | /toptracks, /zoomroom, /rules, /library | 4 |
| Notifications | /optout, /optin | 2 |
| **Total Active** | | **14** |

## Re-enabling Disabled Commands

To re-enable any of the disabled commands:

1. Open `src/bot/index.js`
2. Find lines 246-252 (commented commands)
3. Uncomment the command(s) you want to enable
4. Save file
5. Run: `pm2 restart pnptv-bot`

Example - to re-enable `/playlist`:
```javascript
// Before
// bot.command("playlist", handlePlaylist);

// After
bot.command("playlist", handlePlaylist);
```

## Files Modified
- `src/bot/index.js` - Command registration
- `COMMANDS_ACTIVE.txt` - Reference list (new)

## Next Steps
- Commands are live and ready to use
- Users can access all 14 commands via `/help` menu
- Admin commands remain separate and unchanged
