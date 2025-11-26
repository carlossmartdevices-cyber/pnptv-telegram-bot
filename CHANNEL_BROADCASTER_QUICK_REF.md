# 📢 Channel Broadcaster - Quick Reference

## Access the Feature

```
1. Open bot in Telegram (private chat)
2. Type: /broadcaster
   OR tap /admin → Channel Broadcaster
```

---

## Complete Workflow

### Step 1: Select Channels (Tap to Toggle ✅)
- **📱 Contacto PNP** - General announcements
- **💎 PNPtv PRIME** - Premium members only
- **📢 Both** - All members

### Step 2: Choose Content Type
| Icon | Type | Example |
|------|------|---------|
| 📄 | Text Only | "New feature available!" |
| 🖼️ | Photo + Text | Event poster |
| 🎥 | Video + Text | Tutorial |
| 📎 | Files | PDF, documents |
| 📊 | Poll | "Vote on..." |
| 🔗 | With Menu | Text + buttons |

### Step 3: Compose & Send

**Text Formatting (Markdown):**
```
*bold*          _italic_         ~strikethrough~
`code`          [Link](URL)      
```

**Media:**
- Send photo/video when prompted
- Add caption (optional)

**Buttons:**
- Text: button label
- URL: where it links
- Callback: internal action

### Step 4: Publish Options
- 🚀 **Publish Now** - Immediate delivery
- 📋 **Save as Draft** - Edit later
- 📅 **Schedule** - Set time (coming soon)
- 👁️ **Preview** - Check before sending

---

## Text Formatting Examples

### Basic Formatting
```
*This is bold*
_This is italic_
~This is strikethrough~
`This is code`
```

### Links
```
[Click here](https://pnptv.app)
[Support](/aichat)
```

### Combined Example
```
🎉 *ANNOUNCEMENT*

_Important update:_

Our new features:
• 🤖 AI Support
• 📍 Geolocation
• 💰 Easy payments

[Learn More](https://pnptv.app)
```

---

## Templates

### Template 1: Feature Announcement
```
🎯 *NEW FEATURE: [NAME]*

Brief description

✨ *Key benefits:*
• Benefit 1
• Benefit 2
• Benefit 3

[Learn More](link)
```

### Template 2: Event Promotion
```
🎤 *[EVENT NAME]*

📅 Date: [date]
⏰ Time: [time]
📍 Location: [where]

[RSVP](link)
```

### Template 3: Membership Upsell
```
💎 *UPGRADE TO PREMIUM*

Unlock:
• Full media access
• Unlimited searches
• Instant Zoom rooms
• Exclusive content

[Subscribe](/subscribe)
```

### Template 4: FAQ/Support
```
❓ *FREQUENTLY ASKED QUESTIONS*

*Q: How do I...?*
A: Answer here

*Q: What about...?*
A: Answer here

[More Help](/aichat)
```

### Template 5: Engagement Poll
```
🎯 *WHAT NEXT?*

Help us decide:

[POLL]
☐ Option 1
☐ Option 2
☐ Option 3
☐ Option 4
```

---

## Markdown Cheat Sheet

| Syntax | Result | Use For |
|--------|--------|---------|
| `*text*` | **text** | Bold emphasis |
| `_text_` | *text* | Italic emphasis |
| `~text~` | ~~text~~ | Mistakes, corrections |
| `` `text` `` | `text` | Code, commands |
| `[text](url)` | [text](url) | Links, buttons |

---

## Tips & Best Practices

✅ **DO:**
- Keep messages 2-4 paragraphs max
- Use emojis to break up text
- Include clear call-to-action
- Test links before posting
- Post during peak hours (7-9 PM)
- Use consistent formatting

❌ **DON'T:**
- Post spam/duplicates
- Share admin secrets
- Use channels incorrectly
- Forget CTAs
- Post to sleeping members
- Mix too many formatting styles

---

## Peak Posting Times

**Weekdays:**
- 7-9 PM (evening activity peak)

**Weekends:**
- 10 AM-12 PM (morning)
- 7-9 PM (evening)

**Avoid:**
- 2-4 AM (sleeping)
- 12-1 PM (lunch)

---

## Button Configuration

### Link Button
```
Text: "🎵 Music Library"
URL: https://pnptv.app/library
```

### Command Button
```
Text: "💬 Get Help"
Callback: /aichat
```

### Web App Button
```
Text: "📍 Map"
Web App: https://pnptv.app/map
```

---

## File Types Supported

| Type | Extensions |
|------|-----------|
| Images | .jpg, .png, .gif, .webp |
| Video | .mp4, .webm |
| Audio | .mp3, .ogg, .m4a |
| Documents | .pdf, .doc, .docx, .xlsx |
| Archives | .zip, .rar, .7z |

**Size Limits:**
- Photos: 10 MB
- Videos: 50 MB
- Documents: 50 MB
- Audio: 50 MB

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Post won't send | Check channel IDs in .env |
| Text looks wrong | Use correct Markdown syntax |
| Media won't upload | Check file size, format |
| Buttons don't work | Ensure URL starts with https:// |
| Wizard session expired | Start over with `/broadcaster` |

---

## Analytics & Tracking

After publishing, track:
- ✉️ Delivery count
- 👀 View count
- 🔗 Click count (for buttons)
- ⚠️ Error count

Access from: Channel Broadcaster menu → 📊 View Published

---

## Commands Quick Ref

| Command | Action |
|---------|--------|
| `/broadcaster` | Open Channel Broadcaster |
| `/admin` | Admin menu (includes Broadcaster option) |
| `/done` | Finish text composition in wizard |
| `/aichat` | Switch to AI support |
| `/help` | General help |

---

## Common Mistakes

❌ **Mistake 1:** Forgetting to select channels
- **Fix:** Always tap channels before proceeding

❌ **Mistake 2:** Wrong Markdown syntax
- **Fix:** Use `*text*` not `**text**`

❌ **Mistake 3:** Posting same message twice
- **Fix:** Check drafts before creating new

❌ **Mistake 4:** Link to wrong URL
- **Fix:** Test link in preview before sending

❌ **Mistake 5:** Text too long
- **Fix:** Keep under 4 paragraphs

---

## Pro Tips

💡 **Tip 1: Use Emojis**
Break up text with emojis for readability:
```
🎉 *Feature*
📍 *Location*
💰 *Price*
🔗 *Link*
```

💡 **Tip 2: Test First**
Preview posts before publishing to see formatting

💡 **Tip 3: Segment Channels**
- Use **Contacto PNP** for broad announcements
- Use **PNPtv PRIME** for premium-only features

💡 **Tip 4: Add CTAs**
Every post should have a call-to-action:
- [Join Now](/subscribe)
- [Learn More](/aichat)
- [Vote Below](poll)

💡 **Tip 5: Schedule Smart**
Post during peak activity times for max engagement

---

## Getting Help

📧 **Email:** support@pnptv.app  
💬 **AI Chat:** Type `/aichat`  
🤝 **Admin Support:** DM your admin  
📖 **Full Guide:** Read CHANNEL_BROADCASTER_GUIDE.md  

---

**Last Updated:** November 13, 2025  
**Version:** 1.0
