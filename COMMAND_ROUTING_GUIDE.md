# 📋 Bot Commands - Group vs Private Chat Guide

## 🎯 **Command Behavior Overview**

The PNPtv Bot uses a **smart response system** that automatically routes commands to the appropriate chat type for the best user experience.

---

## ✅ **GROUP COMMANDS** (Responses stay in group)

These commands work directly in group chats and display responses there:

### **🎵 Music Library Commands**
- **`/library`** - Browse music library with interactive play buttons
- **`/toptracks`** - Show most played tracks from the library
- **`/addtrack`** ⚡ - Add new music tracks (Admin only)
- **`/deletetrack`** ⚡ - Delete music tracks (Admin only)
- **`play_track:*`** - Interactive play buttons for tracks

### **🔧 Bot Management Commands**
- **`/status`** - Bot status and health check
- **`/refresh`** - Refresh bot data/cache  
- **`/info`** - Bot information and version

### **Why These Stay in Groups:**
- **Community features** - Library is shared among all group members
- **Interactive elements** - Play buttons need to work for everyone
- **Admin management** - Track operations visible to group moderators
- **Real-time updates** - Status changes relevant to entire group

---

## ❌ **PRIVATE COMMANDS** (Responses sent to private chat)

These commands automatically redirect responses to private chat for privacy and better UX:

### **👤 Personal Features**
- **`/start`** - Initial bot setup and onboarding process
- **`/profile`** - User profile management and settings
- **`/subscribe`** - Subscription management and billing
- **`/map`** - Location sharing and map features
- **`/nearby`** - Find nearby members (privacy-sensitive)
- **`/settimezone`** - Set personal timezone preferences

### **🎬 Content & Entertainment**
- **`/live`** - Live streaming features and controls
- **`/app`** - Access to Telegram Mini App
- **`/schedulecall`** - Schedule personal video calls
- **`/schedulestream`** - Schedule live streaming events
- **`/upcoming`** - View your upcoming events
- **`/playlist`** - Manage personal playlists

### **🤖 AI & Support**
- **`/aichat`** - Start AI chat session (personal conversation)
- **`/endchat`** - End AI chat session
- **`/help`** - Help menu and command explanations

### **⚡ Admin Commands (Private)**
- **`/admin`** - Main admin panel (Admin only)
- **`/plans`** - Subscription plan management (Admin only)
- **`/deleteevent`** - Delete scheduled events (Admin only)

### **Why These Go Private:**
- **Personal information** - Profiles, subscriptions, locations
- **Privacy protection** - Nearby members, personal settings
- **Detailed interfaces** - Complex menus work better in private
- **Admin security** - Sensitive operations stay confidential
- **Clean group chat** - Reduces clutter in group discussions

---

## 🔄 **How Redirection Works**

### **When You Use Private Commands in Groups:**

1. **Command executed**: `/profile` in group chat
2. **Bot responds privately**: Sends profile info to your private chat
3. **Group notification**: 
   ```
   ✉️ I've sent you the response via private message.
   ```
4. **If you haven't started the bot**:
   ```
   ⚠️ @username, you need to start a conversation with me first.
   
   👆 Click on my name and press "Start" to receive private responses.
   
   [🤖 Start Bot]
   ```

### **Benefits of This System:**
- **✅ Privacy protection** - Personal info stays private
- **✅ Clean group chat** - Less clutter from individual responses
- **✅ Better UX** - Complex interfaces work better in private
- **✅ Security** - Admin functions stay confidential
- **✅ Community focus** - Group chat stays focused on community features

---

## 🎯 **Quick Reference**

### **Need to use in GROUP? Use these:**
```
/library     - Browse music
/toptracks   - Popular tracks  
/addtrack    - Add music (admin)
/deletetrack - Delete music (admin)
/status      - Bot status
/info        - Bot info
```

### **Need to use PRIVATE? These redirect automatically:**
```
/start       - Setup bot
/profile     - Your profile
/nearby      - Find members
/subscribe   - Manage subscription
/admin       - Admin panel
/help        - Get help
```

---

## 🔧 **Technical Implementation**

### **Middleware Configuration**
Located in: `src/bot/middleware/privateResponseMiddleware.js`

```javascript
const groupOnlyCommands = [
  '/status', '/refresh', '/info', 
  '/library', '/toptracks', '/addtrack', '/deletetrack'
];
```

### **How It Works:**
1. **Detects group chats** - Checks if chat type is 'group' or 'supergroup'
2. **Command filtering** - Compares command against group-only list
3. **Response routing** - Either allows group response or redirects to private
4. **Error handling** - Shows "Start Bot" button if private chat fails
5. **User feedback** - Clear messages about where responses are sent

---

## 📱 **User Experience**

### **In Group Chats:**
- **Music commands** work instantly with full interactivity
- **Bot management** commands show results immediately
- **Personal commands** show helpful redirection messages
- **Clean interface** - No personal info cluttering group

### **In Private Chats:**
- **All commands** work normally without redirection
- **Full privacy** for personal information and settings
- **Rich interfaces** for complex features like admin panels
- **Secure communication** for sensitive operations

---

## 🎉 **Best Practices**

### **For Group Admins:**
- Use **`/library`**, **`/addtrack`**, **`/toptracks`** directly in groups
- Admin commands like **`/admin`** will redirect to private for security
- **`/status`** and **`/info`** work great for group troubleshooting

### **For Group Members:**
- **Music features** work directly in groups - no private chat needed
- **Personal features** like **`/profile`**, **`/nearby`** automatically go private
- Start the bot privately first to receive redirected responses

### **For Bot Setup:**
- Always run **`/start`** in private chat first
- This enables receiving redirected responses from group commands
- All subsequent personal features will work smoothly

The bot's smart routing system ensures **optimal user experience** while maintaining **privacy and security**! 🚀