# Rules & Group Menu - Quick Reference

## Commands

### User Commands
```bash
/rules   # View community rules & guidelines
/menu    # Open group menu with quick access
```

### Works In
- ✅ Private chats
- ✅ Group chats
- ✅ Supergroups

---

## What Users See

### `/rules` - Community Rules
```
📋 **Community Conduct Rules**

5.1 Respect & Consent
• All interactions must be consensual
• No discrimination or abuse
• No private info sharing

5.2 Prohibited Content
❌ Minors, Animals, Sexual Violence
❌ Hate Speech, Racism, Extreme Violence

5.3 Geolocation Use
• Optional and voluntary
• No tracking or harassment

5.4 Platform Rules
• Follow Telegram ToS
• No spam, bots, or copyright violations

5.5 Account Security
• Protect your password
• Don't share account access

5.6 Consequences
Warning → Mute → Ban
```

### `/menu` - Group Menu
```
👥 **Group Menu**

Select an option:

[📖 Rules] [❓ Help]
[💎 Plans] [🤖 AI Chat]
[🔙 Close]
```

---

## Interactive Features

### Rules Menu Topics
- 📖 View All - Full rules
- ✅ Respect - Consent & discrimination rules
- ⚠️ Prohibited - What's not allowed
- 🗺️ Location - Geolocation safety
- 🔒 Security - Account protection

### Menu Options
- 📖 Rules - Access community rules
- ❓ Help - Show available commands
- 💎 Plans - Link to premium
- 🤖 AI Chat - Link to support
- 🔙 Close - Dismiss menu

---

## Languages

- 🇬🇧 English
- 🇪🇸 Spanish (Español)

**Auto-selected** based on user's language preference

---

## Technical Info

### Files
- `/src/bot/handlers/rules.js` - Rules logic
- `/src/bot/handlers/groupMenu.js` - Menu logic
- `/src/bot/index.js` - Command registration

### Callbacks
- `rules_*` - Rules actions
- `group_menu*` - Menu actions

### No Database Required
- Uses existing sessions
- No new collections
- Zero performance impact

---

## Common Tasks

### Moderator: Show Rules
Send `/rules` in group to display them

### Admin: Modify Rules
Edit `/src/bot/handlers/rules.js` (line 20+ for EN, line 60+ for ES)

### User: View Specific Topic
1. Send `/rules`
2. Click topic (Respect, Prohibited, etc.)
3. View information

### User: Access Menu
1. Send `/menu`
2. Select option
3. Get information or link

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Command not working | Restart bot |
| Wrong language | Complete `/start` setup |
| Buttons not responding | Reload page/close & reopen |
| Menu deleted | Send `/menu` again |

---

## Stats

- **Commands:** 2 new
- **Callbacks:** 12+ handlers
- **Languages:** 2 (EN, ES)
- **Files:** 2 new, 2 modified
- **Lines Added:** ~400
- **Database Queries:** 0
- **Performance Impact:** Negligible

---

## Status

✅ **LIVE & READY**

- Command: `/rules` - Active
- Command: `/menu` - Active
- Both languages working
- All tests passing
- Production ready

---

**Last Updated:** November 13, 2025
**Status:** ✅ Active
