# 📅 Scheduled Broadcasts - Quick Start Guide

**For:** Admin users  
**Purpose:** Schedule future broadcast messages (up to 12 concurrent)

---

## 🚀 Quick Start (30 seconds)

### Step 1: Open Admin Panel
```
Send: /admin
Click: ⚙️ Admin Panel
```

### Step 2: Access Scheduled Broadcasts
```
Click: 📅 Scheduled
```

### Step 3: Create New Broadcast
```
Click: 📢 Schedule Broadcast
```

### Step 4: Enter Date & Time
```
Format: DD/MM/YYYY HH:MM
Example: 25/12/2024 14:30

Press: Enter/Send
```

### Step 5: Follow Wizard (5 steps)
1. Select language (EN, ES, All)
2. Select users (All, Subscribers, Free, Expired)
3. Add media (optional)
4. Write message
5. Add buttons (optional)

### Step 6: Save
```
Click: ✅ Save broadcast
```

**Done!** Message sends automatically at scheduled time ✅

---

## 📋 Common Tasks

### View Scheduled Broadcasts
```
/admin → 📅 Scheduled
```
Shows:
- ✅ Count (e.g., 3/12)
- 📅 Scheduled time
- ⏱️ Time remaining
- 🔤 Language target
- 👥 User status
- 📝 Message preview

### Cancel a Broadcast
```
1. Go to 📅 Scheduled
2. Click ✖️ on the broadcast
3. Status changes to "cancelled"
```

### Refresh List
```
📅 Scheduled → Click 🔄 Refresh
```

---

## ⏰ When to Schedule

### Best Times

| Use Case | When | Why |
|----------|------|-----|
| **Promotions** | Off-peak hours | Higher engagement |
| **Newsletters** | Same day/time weekly | Predictable |
| **Urgent news** | ASAP | Immediate reach |
| **Campaigns** | Launch date | Coordinated timing |
| **Reminders** | 24h before | Higher action rate |

### Time Zone

- Enter time in **your local timezone**
- Bot converts automatically
- Example: If you're in EST and enter 14:30, it sends at 2:30 PM EST

---

## 🎯 Targeting Options

### Language
```
🌍 All Languages       → Everyone
🇺🇸 English Only       → Only English-speaking users
🇪🇸 Spanish Only       → Only Spanish-speaking users
```

### User Status
```
👥 All Status           → Everyone
💎 Active Subscribers   → Premium members only
🆓 Free Tier Only       → Free users only
⏰ Expired Subscriptions → Lapsed members (win them back!)
```

### Examples
```
Spanish + Subscribers = Spanish-speaking premium members
English + Expired = English users who stopped subscribing
All Languages + All = Everyone
```

---

## 📝 Message Tips

### Text
- Max 4,096 characters
- Supports markdown:
  - **bold** → `**text**`
  - _italic_ → `_text_`
  - Code → `` `code` ``

### Media
- Optional (photos, videos, documents)
- Include in broadcast preview
- Better engagement

### Buttons
- Format: `Text | URL`
- Example:
  ```
  Visit Site | https://example.com
  Learn More | https://example.com/info
  ```
- Max 10 buttons
- Each in separate line

---

## ⚠️ Important Notes

1. **12 Broadcast Limit**
   - Max 12 concurrent scheduled broadcasts
   - Once sent, slot becomes available
   - Cancel to free slot immediately

2. **Time Accuracy**
   - ±30 seconds from scheduled time
   - Depends on scheduler run interval
   - Close enough for most use cases

3. **Cannot Edit**
   - Currently can't edit after saving
   - Cancel and reschedule to change

4. **Rate Limiting**
   - 100ms between each user
   - 1,000 users = ~100 seconds
   - Normal and expected

---

## ✅ Checklist Before Saving

- [ ] Date is in future
- [ ] Time format is DD/MM/YYYY HH:MM
- [ ] Language selected
- [ ] User status selected
- [ ] Message text complete
- [ ] Buttons valid format (if added)
- [ ] Preview looks good

---

## 🆘 Troubleshooting

### "Limit of 12 reached"
- Cancel old broadcasts
- Wait for pending ones to execute
- Check sent broadcasts in history

### Date format error
- Use: DD/MM/YYYY HH:MM
- Example: 25/12/2024 14:30
- Not: 12/25/2024 or 25-12-2024

### Broadcast not sending
- Check bot is running
- Verify scheduled time has passed
- Check PM2 logs
- Verify users match criteria

### No users reached
- Check language filter
- Check status filter
- May have all blocked bot

---

## 📊 View Results

### After Execution
```
✅ Broadcast sent successfully

✉️ Sent: 1,234
❌ Failed: 5
⏭️ Skipped: 23
```

- **Sent**: Successfully delivered
- **Failed**: Network/error (rare)
- **Skipped**: User blocked bot

---

## 🎓 Example: Holiday Promotion

**Scenario:** Christmas sale for Spanish premium members

```
Step 1: Enter date
25/12/2024 14:00

Step 2: Language
🇪🇸 Spanish Only

Step 3: Status
💎 Active Subscribers

Step 4: Media
(Optional - upload festive image)

Step 5: Message
🎄 ¡Especial Navideño! 🎄

50% de descuento solo hoy
en tu próxima compra.

¡Válido solo 25 de diciembre!

Step 6: Buttons
Reclamar | https://promo.example.com/xmas

Step 7: Review & Save
✅ Save broadcast
```

**Result:** On Dec 25 at 2 PM, all Spanish premium subscribers get the message 🎉

---

## 💡 Pro Tips

1. **Test First**
   - Create test broadcast for 5 min from now
   - Verify message format and content
   - Then create production broadcast

2. **Use Clear Time**
   - Schedule at :00 or :30 for clarity
   - Easier to remember and verify
   - Less confusion with time zones

3. **Target Wisely**
   - Combine filters for precision
   - Example: Spanish + Subscribers (not "All Languages")
   - More relevant = better engagement

4. **Batch Promotions**
   - Schedule multiple languages separately
   - Each at optimal time for region
   - Better conversion rates

5. **Monitor Execution**
   - Check logs after scheduled time
   - Verify statistics make sense
   - Watch for unusual failure rates

---

## 📱 Mobile Considerations

- Works on mobile admin interface
- Date picker works on Telegram
- Format: DD/MM/YYYY HH:MM (type manually)
- List view auto-formats

---

## 🔄 Workflow

```
Create Broadcast
    ↓
Schedule Date/Time
    ↓
Configure Content
    ↓
Review Preview
    ↓
Save Broadcast
    ↓
Wait for scheduled time
    ↓
Automatic Execution ✅
    ↓
View Statistics
```

---

## 🎯 Use Cases

### Daily Newsletter
```
Schedule: Every weekday @ 10:00 AM
Target: All users
Content: Weekly digest + links
```

### Promotional Campaign
```
Schedule: Launch date @ 2:00 PM
Target: Premium members
Content: Limited offer + button
```

### Re-engagement
```
Schedule: Weekend @ 11:00 AM
Target: Expired subscriptions
Content: Winning back message + CTA
```

### Announcements
```
Schedule: ASAP (e.g., 5 min from now)
Target: All users
Content: Important update
```

---

## ✨ That's It!

You're now ready to schedule broadcasts. Questions?

- **Guide:** `/admin` → Help
- **Logs:** Check bot logs if issues
- **Cancel:** Easy reschedule via cancel + recreate

**Happy broadcasting! 📢**
