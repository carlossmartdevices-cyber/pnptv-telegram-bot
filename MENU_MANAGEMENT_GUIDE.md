# 📋 Menu Management System - Complete Guide

## Overview

Your PNPtv bot now has an **advanced menu management system** that lets you:

- ✏️ Edit menu buttons directly from Telegram
- 🎨 Add images, videos, and GIFs to menus
- 🌍 Customize menus for each language (English/Spanish)
- 👁️ Preview changes before applying them
- 💾 Store configurations in Firebase
- 🔄 Reset to defaults anytime

---

## 🚀 Quick Start

### Accessing Menu Manager

1. Open your bot on Telegram
2. Use `/admin` command (admin only)
3. Click **"📋 Menu Config"**
4. You'll see the Menu Configuration Center

---

## 📱 Main Features

### 1. **Edit Menus**

You can edit three types of menus:

#### **🏠 Main Menu** (Keyboard)
- Appears when users interact with the bot
- Has English and Spanish versions
- Buttons arranged in rows
- Can add custom buttons and emojis

#### **👤 Profile Menu** (Inline)
- Appears in user profile screens
- Inline buttons with callback actions
- Single language (works for all)

#### **💎 Subscription Menu** (Inline)
- Shows subscription/plan options
- Inline buttons with URLs or callbacks

---

### 2. **Media Manager**

Add visual content to make menus more engaging!

#### **What You Can Add:**
- 📸 Photos (JPG, PNG)
- 🎥 Videos (MP4)
- 🎬 GIFs/Animations

#### **How It Works:**
1. Click **"🎨 Media Manager"**
2. Choose a menu type (Main, Profile, or Subscription)
3. Click **"➕ Add Media"**
4. Upload your photo/video/GIF
5. Optionally add a caption
6. Enter a menu item ID (e.g., `main` or `default`)
7. Done! Your media is attached

---

## 📚 Step-by-Step Guide

### **Adding Media to Main Menu**

**Example: Add a welcome video to the main menu**

1. Go to `/admin` → **Menu Config** → **Media Manager**
2. Click **"➕ Add Media 🏠 Main"**
3. Send your video file to the bot
4. When asked for Item ID, type: `main`
5. Your video is now attached!

When users see the main menu, they'll see your video with the menu buttons.

---

### **Editing Menu Buttons**

**Example: Change the "My Profile" button to "View Profile"**

1. Go to `/admin` → **Menu Config** → **Edit Main Menu**
2. Select **English Version** or **Spanish Version**
3. You'll see the current menu structure
4. Click **"➖ Remove Button"** to remove the old one
5. Click **"➕ Add Button"** to add the new one
6. Follow the prompts to add "View Profile"
7. Click **"💾 Save Changes"**

---

### **Previewing Menus**

Before applying changes, you can preview how your menu will look:

1. Go to the menu editor
2. Click **"👁️ Preview Menu"**
3. The bot will show you exactly how users will see it
4. With media (if attached) and buttons

---

## 🗂️ Menu Item IDs

When adding media, you need to specify an **Item ID**. Here are recommended IDs:

### For Main Menu:
- `main` or `default` - Default display for main menu
- `welcome` - Welcome screen
- `promo` - Promotional content

### For Profile Menu:
- `profile_header` - Top of profile view
- `profile_bg` - Background image

### For Subscription Menu:
- `silver_plan` - Silver tier promotion
- `golden_plan` - Golden tier promotion
- `payment` - Payment screen

---

## 🔧 Technical Details

### **Where Data Is Stored**

All menu configurations and media are stored in **Firebase Firestore**:

- **Collection:** `menuConfigs` - Menu button configurations
- **Collection:** `menuMedia` - Media file references

### **File Structure**

```
src/
├── utils/
│   ├── menuManager.js        # Menu config & media CRUD
│   └── menuDisplay.js         # Display menus with media
├── bot/
│   └── handlers/
│       └── admin/
│           └── menuConfig.js  # Admin UI for menu editing
```

### **How Media Works**

When you upload a photo/video/GIF:
1. Telegram stores the file and gives you a `file_id`
2. We save the `file_id` in Firestore
3. When displaying menus, we use the `file_id` to send the media
4. No file storage needed - Telegram handles it!

---

## 🎨 Best Practices

### **For Media:**
- ✅ Use high-quality images (but not too large)
- ✅ Keep videos under 30 seconds for quick loading
- ✅ GIFs should be under 5MB
- ✅ Add captions to explain what users are seeing
- ✅ Test on mobile devices

### **For Menu Buttons:**
- ✅ Keep button text short (2-4 words)
- ✅ Use emojis for visual appeal
- ✅ Group related actions together
- ✅ Don't exceed 3 rows for keyboard menus
- ✅ Test both languages (EN/ES)

### **For Item IDs:**
- ✅ Use descriptive names (`welcome`, `profile_header`)
- ✅ Use lowercase with underscores
- ✅ Keep them consistent
- ✅ Document custom IDs

---

## 🔄 Reset to Defaults

If you want to undo all changes and go back to the original menus:

1. Go to `/admin` → **Menu Config**
2. Click **"🔄 Reset to Defaults"**
3. Confirm your choice
4. All customizations will be removed
5. Menus will return to the original code-based configuration

---

## 📊 Menu Statistics

View information about your menus:

- Number of buttons per menu
- Number of media items attached
- Last update times
- Menu structure analysis

Go to **Menu Config** → Select a menu → Click **"📊 Analyze Structure"**

---

## 🌍 Multi-Language Support

The Main Menu has separate configurations for English and Spanish:

- **English Users** see the English menu
- **Spanish Users** see the Spanish menu
- Media can be shared or unique per language

**To add language-specific media:**
- Use item IDs like `main_en` and `main_es`
- Upload different images for each language

---

## ⚡ Quick Commands

| Action | Path |
|--------|------|
| Open Menu Manager | `/admin` → **Menu Config** |
| Add Media | **Menu Config** → **Media Manager** → **Add Media** |
| Edit Main Menu | **Menu Config** → **Edit Main Menu** |
| Preview | Select menu → **Preview Menu** |
| View Media | **Media Manager** → **View Media** |
| Delete Media | **Media Manager** → **Delete Media** |

---

## 🆘 Troubleshooting

### **Media doesn't appear**

**Problem:** I uploaded media but users don't see it

**Solution:**
1. Check that you used `main` or `default` as the Item ID
2. Make sure the file uploaded successfully (check Media Manager)
3. Test with `/admin` → Preview Menu
4. Restart the bot if needed

---

### **Menu buttons not updating**

**Problem:** I changed buttons but they look the same

**Solution:**
1. Make sure you clicked **"💾 Save Changes"**
2. The bot may be using cached menus - restart it
3. Check both EN and ES versions if editing Main Menu
4. Verify in **Menu Config** that changes were saved

---

### **File too large error**

**Problem:** Can't upload video/GIF

**Solution:**
- Telegram has file size limits:
  - Photos: 10MB max
  - Videos: 50MB max (20MB recommended)
  - GIFs: 10MB max
- Compress your media before uploading
- Use online tools like TinyPNG or HandBrake

---

## 💡 Use Cases

### **Promotional Campaigns**

Add a promotional video to the main menu when launching new features:

```
1. Upload promo video
2. Use Item ID: "main"
3. Add caption: "🔥 New Feature Alert!"
4. When campaign ends, delete the media
```

---

### **Seasonal Updates**

Change menu images for holidays or events:

```
1. Upload Christmas theme image
2. Item ID: "main"
3. After holiday, replace with new image
```

---

### **A/B Testing**

Test different menu media:

```
1. Add media with ID: "test_a"
2. Monitor user engagement
3. Switch to different media: "test_b"
4. Keep the one that performs better
```

---

## 🔐 Security

- ✅ Only admins can access Menu Config
- ✅ Media is stored using Telegram's secure servers
- ✅ File IDs are non-sensitive
- ✅ All actions are logged
- ✅ Firestore security rules apply

---

## 🚀 Advanced Usage

### **Using Menu Display in Your Code**

If you want to show menus with media in your custom handlers:

```javascript
const { sendMenuWithMedia } = require("./utils/menuDisplay");

// In your handler
await sendMenuWithMedia(ctx, "main", "Welcome back!");
```

### **Programmatic Media Management**

```javascript
const { saveMenuMedia, getMenuMedia } = require("./utils/menuManager");

// Save media
await saveMenuMedia("main", "welcome", {
  type: "photo",
  fileId: "AgACAgIAAx...",
  caption: "Welcome to PNPtv!",
});

// Get media
const media = await getMenuMedia("main", "welcome");
```

---

## 📖 API Reference

### **menuManager.js**

| Function | Description |
|----------|-------------|
| `getMenuConfig(type, lang)` | Get menu configuration |
| `saveMenuConfig(type, lang, config)` | Save menu configuration |
| `getMenuMedia(type, itemId)` | Get media for menu item |
| `saveMenuMedia(type, itemId, data)` | Save media |
| `deleteMenuMedia(type, itemId)` | Delete media |
| `getAllMenuMedia(type)` | Get all media for a menu |

### **menuDisplay.js**

| Function | Description |
|----------|-------------|
| `sendMenuWithMedia(ctx, type, text, options)` | Send menu with media |
| `editMenuWithMedia(ctx, type, text, options)` | Edit menu message |
| `sendMainMenu(ctx, text)` | Quick send main menu |

---

## ✅ Checklist for New Media

Before adding media to production:

- [ ] Image/video is clear and high-quality
- [ ] File size is reasonable (<10MB)
- [ ] Caption is added (if needed)
- [ ] Item ID is descriptive
- [ ] Tested on mobile device
- [ ] Both languages tested (if applicable)
- [ ] Preview looks good
- [ ] Logged what was changed

---

## 🎓 Training Checklist

For team members learning the system:

- [ ] Can access Menu Config
- [ ] Can upload a test image
- [ ] Can view media list
- [ ] Can delete test media
- [ ] Can preview menu
- [ ] Understands Item IDs
- [ ] Knows how to reset if needed
- [ ] Can check menu statistics

---

## 📞 Need Help?

- Check the [Quick Text Guide](./QUICK_TEXT_GUIDE.md) for text changes
- Review [Main Documentation](./HOW_TO_CHANGE_BOT_TEXTS.md)
- Test in a development environment first
- Keep backups of important media

---

## 🎉 Summary

You now have a powerful menu management system that gives you full control over your bot's menus without touching code!

**Key Takeaways:**
- Edit menus directly from Telegram
- Add media to make menus visual
- Changes are stored in Firebase
- Easy to preview and reset
- Multi-language support
- Secure and logged

**Happy customizing! 🚀**
