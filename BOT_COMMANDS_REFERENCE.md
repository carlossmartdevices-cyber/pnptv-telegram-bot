# Comprehensive Bot Commands Reference

## Direct Slash Commands (src/bot/index.js)

### User Commands
1. **/start** - Welcome/Onboarding Handler
   - File: `/root/bot 1/src/bot/handlers/start.js`
   - Handles new user onboarding, age verification, language selection
   - Shows main menu for returning users

2. **/help** - Help Information
   - File: `/root/bot 1/src/bot/handlers/help.js`
   - Shows help info with links to premium plans and support

3. **/map** - Location-based Search
   - File: `/root/bot 1/src/bot/handlers/map.js`
   - Search for nearby users within 5km, 10km, 25km, or 50km radius
   - Requires location sharing

4. **/nearby** - Nearby Users Mini App
   - File: `/root/bot 1/src/bot/handlers/nearby.js`
   - Opens "Who's Getting Spun Near Me?" mini app
   - Search limit: 3 per week for free users

5. **/live** - Live Streams
   - File: `/root/bot 1/src/bot/handlers/live.js`
   - View/start live streams (coming soon feature)

6. **/app** - Mini App Handler
   - File: `/root/bot 1/src/bot/handlers/app.js`
   - Opens PNPtv Community web app

7. **/profile** - User Profile
   - File: `/root/bot 1/src/bot/handlers/profile.js`
   - View/edit profile (bio, photo, location)
   - Edit photo, location, bio
   - View settings and toggle ads

8. **/subscribe** - Subscription Plans
   - File: `/root/bot 1/src/bot/handlers/subscribe.js`
   - Shows available subscription plans and pricing

9. **/admin** - Admin Panel
   - File: `/root/bot 1/src/bot/handlers/admin.js`
   - Requires admin middleware
   - Access admin features (stats, user management, broadcasts)

10. **/plans** - Plan Dashboard
    - File: `/root/bot 1/src/bot/handlers/admin/planManager.js`
    - Requires admin middleware
    - Manage subscription plans

11. **/aichat** - AI Chat Support
    - File: `/root/bot 1/src/bot/handlers/aiChat.js`
    - Start conversation with Mistral AI support assistant
    - Uses custom instructions for PNPtv support

12. **/endchat** - End AI Chat
    - File: `/root/bot 1/src/bot/handlers/aiChat.js`
    - Exit AI chat session and return to main menu

### Community Commands (Integrated from SantinoBot)

13. **/library** - Music Library
    - File: `/root/bot 1/src/bot/handlers/community.js`
    - Browse music/podcast library
    - Premium feature only

14. **/toptracks** - Top Tracks
    - File: `/root/bot 1/src/bot/handlers/community.js`
    - Show most played tracks in community

15. **/schedulecall** - Schedule Video Call
    - File: `/root/bot 1/src/bot/handlers/community.js`
    - Schedule private video calls (premium, coming soon)

16. **/schedulestream** - Schedule Live Stream
    - File: `/root/bot 1/src/bot/handlers/community.js`
    - Schedule live broadcasts (premium, coming soon)

17. **/upcoming** - Upcoming Events
    - File: `/root/bot 1/src/bot/handlers/community.js`
    - View scheduled broadcasts and events

---

## Callback Actions / Inline Buttons (src/bot/index.js)

### Main Menu Actions
- **back_to_main** - Return to main menu
- **show_my_profile** - View user profile
- **show_nearby** - Open nearby users feature
- **show_help** - View help information
- **show_subscription_plans** - View subscription options

### Profile Edit Actions
- **edit_bio** - Edit user biography
- **edit_location** - Edit/share location
- **edit_photo** - Upload/change profile photo
- **profile_settings** - Open settings menu
- **settings_toggle_ads** - Toggle advertisement messages
- **settings_back** - Return to profile

### Onboarding Callbacks
- **lang_[en|es]** - Language selection (en/es)
- **language_[en|es]** - Alternative language format
- **confirm_age** - Confirm age requirement
- **accept_terms** - Accept terms of service
- **decline_terms** - Decline terms of service
- **accept_privacy** - Accept privacy policy
- **decline_privacy** - Decline privacy policy

### Subscription Callbacks
- **plan_select_[planId]** - Select regular payment plan
- **show_subscription_plans** - Back to subscription menu

### Daimo Pay Callbacks
- **daimo_show_plans** - Show Daimo Pay plans
- **daimo_plan_[planId]** - Select Daimo Pay plan
- **daimo_help** - Show Daimo Pay information

### Map Callbacks
- **share_location** - Request location sharing
- **search_nearby_[5|10|25|50]** - Search users at distance radius
- **profile_view_map** - View map from profile

### Nearby Callbacks
- **open_nearby_app** - Open nearby mini app

### Live Callbacks
- **start_live** - Start live stream
- **view_lives** - View active streams

### AI Chat Callbacks
- **start_ai_chat** - Start AI support conversation

### Admin Callbacks
- **admin_[action]** - Various admin actions
  - admin_back - Return to admin panel
  - admin_stats - View statistics
  - admin_list_all - List all users
  - admin_search_user - Search for user
  - admin_list_premium - List premium users
  - admin_list_new - List new users
  - admin_list_page_[n] - Paginate users
  - admin_list_all - List all users
  - admin_edit_tier_[userId] - Edit user tier
  - admin_message_[userId] - Send message to user
  - admin_ban_[userId] - Ban user
  - admin_unban_[userId] - Unban user
  - admin_change_tier_[userId] - Change user subscription tier
  - admin_modify_expiration_[userId] - Modify subscription expiration
  - admin_quick_activate_[userId]_[tier]_[days] - Quick membership activation
  - admin_tier:[tier]:[days]:[userId] - Set specific tier duration
  - admin_activate_membership - Membership activation flow
  - admin_update_member_userid - Update member flow
  - admin_extend_userid - Extend membership flow
  - admin_confirm_ban_[userId] - Confirm ban action
  - admin_plan_edit_[field]_[planName] - Edit plan field

- **bcast_[action]** - Broadcast-related callbacks
  - bcast_lang_[en|es] - Broadcast language selection
  - bcast_select_audience - Select broadcast audience
  - bcast_filter_* - Broadcast filter options
  - bcast_schedule_confirm - Confirm scheduled broadcast
  - bcast_send_now - Send broadcast immediately

- **plan:[action]** - Plan manager callbacks

---

## Broadcast Wizard Flow (Admin)

The broadcast system supports step-by-step configuration:
1. Select broadcast audience
2. Upload media (optional)
3. Enter message text
4. Add buttons (optional)
5. Schedule date (optional)
6. Confirm and send

Broadcast callbacks handle:
- **bcast_lang_[language]** - Language selection
- **bcast_filter_* ** - Audience filtering
- **bcast_schedule_confirm** - Schedule confirmation
- **bcast_send_now** - Immediate send

---

## Form Input Handlers (Waiting States)

The bot uses `ctx.session.waitingFor` to manage multi-step flows:

### Profile Management
- **"bio"** - Waiting for biography text
- **"location_text"** - Waiting for location text input
- **"profile_photo"** - Waiting for photo upload

### Admin Operations
- **"admin_search"** - Waiting for user search query
- **"admin_message_[userId]"** - Waiting for message to send to user
- **"admin_activate_userid"** - Waiting for user ID for membership activation
- **"admin_update_member_userid"** - Waiting for user ID for member update
- **"admin_extend_userid"** - Waiting for user ID for membership extension
- **"admin_extend_custom_days_[userId]"** - Waiting for custom extension days
- **"admin_modify_expiration_[userId]"** - Waiting for new expiration date
- **"admin_plan_edit_[field]_[planName]"** - Waiting for plan field value

### Broadcast Operations
- **"broadcast_media"** - Waiting for broadcast media (photo/video/document)
- **"broadcast_text"** - Waiting for broadcast message text
- **"broadcast_message"** - Waiting for broadcast message (legacy)
- **"broadcast_buttons"** - Waiting for button configuration
- **"broadcast_schedule_date"** - Waiting for broadcast schedule date
- **"broadcast_lang_[language]"** - Broadcast language selection
- **"bcast_lang_[language]"** - Broadcast language (new wizard)

---

## Media Message Handlers

The bot handles these media types globally:
- **photo** - Profile photos, broadcast media
- **video** - Broadcast media, group enforcement
- **document** - Broadcast media
- **audio** - Music library support
- **voice** - Group restrictions
- **video_note** - Group restrictions
- **sticker** - Group restrictions
- **animation** - Group restrictions

---

## Group Management Features

Integrated from SantinoBot:
- **new_chat_members** - Welcome new group members
- Media message enforcement based on permissions
- Profile photo and bio sharing restrictions in groups

---

## Admin Functions (src/bot/handlers/admin.js)

Main Admin Functions:
1. **adminPanel()** - Main admin interface
2. **showStats()** - Statistics dashboard
3. **listUsers()** - User management menu
4. **listAllUsers()** - Paginated user list
5. **searchUser()** - Search for specific users
6. **executeSearch()** - Execute user search
7. **showUserDetails()** - View user profile (admin)
8. **editUserTier()** - Edit user subscription tier
9. **setUserTier()** - Apply tier change
10. **broadcastMessage()** - Create broadcast wizard
11. **handleBroadcastWizard()** - Broadcast step handling
12. **showBroadcastConfirmation()** - Broadcast preview
13. **executeBroadcast()** - Send broadcast to users
14. **messageUser()** - Send direct message to user
15. **executeSendMessage()** - Execute direct message send
16. **banUser()** - Ban a user
17. **executeBanUser()** - Execute user ban
18. **unbanUser()** - Unban a user
19. **listPremiumUsers()** - Show premium subscribers
20. **listNewUsers()** - Show new users (7 days)
21. **startMembershipActivation()** - Manual membership activation
22. **processActivationUserId()** - Process activation
23. **executeQuickActivation()** - Quick activate membership
24. **startUpdateMember()** - Update member subscription
25. **processUpdateMemberUserId()** - Process member update
26. **handlePlanCallback()** - Plan manager callbacks
27. **handlePlanTextResponse()** - Handle plan text input
28. **showPlanDashboard()** - Plan management dashboard

---

## Daimo Pay Functions (src/bot/handlers/daimoPayHandler.js)

1. **showDaimoPlans()** - Display Daimo Pay plans
2. **handleDaimoPlanSelection()** - Process plan selection and create payment
3. **handleDaimoHelp()** - Show Daimo Pay information

---

## AI Chat Functions (src/bot/handlers/aiChat.js)

1. **startAIChat()** - Initialize AI chat session
2. **endAIChat()** - End chat and return to main menu
3. **handleChatMessage()** - Process user messages in chat
4. **handleAIChatCallback()** - Handle chat button callbacks

AI Assistant Features:
- Mistral AI integration
- Support for English and Spanish
- Rate limiting (3 seconds between messages)
- Message history (last 20 messages)
- Automatic language detection
- Sales-focused (promotes Daimo Pay and premium plans)

---

## Community Functions (src/bot/handlers/community.js)

1. **handleNearby()** - Find nearby members
2. **handleLibrary()** - Browse music library
3. **handleTopTracks()** - Show top played tracks
4. **handleScheduleCall()** - Schedule video call (premium, coming soon)
5. **handleScheduleStream()** - Schedule live stream (premium, coming soon)
6. **handleUpcoming()** - Show scheduled broadcasts

Community Features:
- Nearby user search with distance limits
- Music library browsing (premium only)
- Playlist creation and track management
- Event scheduling (premium)
- Live DJ support

---

## Plan Manager Functions (src/bot/handlers/admin/planManager.js)

1. **showPlanDashboard()** - Admin plan management interface
2. **handlePlanCallback()** - Process plan callbacks
3. **handlePlanTextResponse()** - Handle plan text input
4. **formatPlanSummary()** - Format plan display

Plan Management Features:
- Create, edit, delete subscription plans
- Set pricing and duration
- Configure plan icons and descriptions
- Manage plan activation

---

## Key Features by Category

### User Management
- Profile creation and editing
- Photo uploads
- Bio and location management
- Tier/subscription tracking
- Settings and privacy preferences

### Subscription & Payment
- Multiple plan options
- Daimo Pay integration (USDC stablecoin)
- Automatic membership activation
- Manual activation by admins
- Expiration tracking and renewal

### Community Features
- Geolocation-based member discovery
- Search limits for free users
- Music library and playlists
- Live streaming and video calls
- Event scheduling

### Admin Tools
- User management (search, ban, unban)
- Broadcasting to users (with filters and scheduling)
- Plan management
- Statistics and reporting
- Membership activation and updates
- Tier management

### AI Support
- Mistral AI integration
- Multi-language support
- Customizable instructions for support
- Sales promotion (Daimo Pay, subscriptions)

---

## Session State Management

Session variables track:
- **onboardingComplete** - Onboarding status
- **language** - User language preference (en/es)
- **tier** - User subscription tier
- **aiChatActive** - AI chat session status
- **aiChatHistory** - Conversation history
- **waitingFor** - Waiting state for form inputs
- **awaitingEmail** - Email collection during onboarding

---

## Configuration & Integration

### Environment Variables
- **TELEGRAM_TOKEN** - Bot token
- **MISTRAL_API_KEY** - AI assistant key
- **MISTRAL_AGENT_ID** - AI agent ID
- **WEB_APP_URL** - Mini app URL
- **DAIMO_PAY_API** - Daimo Pay integration

### Firebase Integration
- User profiles and sessions
- Subscription data
- Activity tracking
- Broadcast scheduling

### External Services
- Mistral AI (chat responses)
- Daimo Pay (crypto payments)
- Telegram Mini Apps
- Geolocation services

