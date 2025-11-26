# Nearby Users Mini App

## Overview

The Nearby Users Mini App ("Who's Getting Spun Near Me?") is a dedicated Telegram Mini App that focuses on discovering and connecting with nearby users. It implements a freemium model where users can chat with their first 3 nearby users for free, with unlimited chats available through a subscription.

## Features

### Core Functionality
- **Location-based discovery**: Shows users sorted by distance
- **Radius selection**: Search within 5km, 10km, 25km, or 50km
- **User profiles**: View detailed information about nearby users
- **Real-time updates**: Refresh to see current nearby users

### Freemium Model
- **3 Free Chats**: Users can unlock and chat with their first 3 nearby users for free
- **Subscription Required**: Additional users require an active subscription
- **Visual Indicators**: Clear UI showing locked/unlocked users and remaining free chats
- **Persistent Tracking**: Free chat usage is tracked in localStorage

### User Interface
- **User Cards**: Display username, tier, distance, XP, and bio preview
- **Lock Icons**: Visual indication of locked users
- **Modal Details**: Full user profile with all information
- **Chat Buttons**: Direct integration with Telegram for starting conversations
- **Upgrade Prompts**: Clear CTAs to view subscription plans

## Files

### Frontend
- `src/web/public/nearby.html` - HTML structure
- `src/web/public/nearby.js` - JavaScript logic and API integration
- `src/web/public/nearby.css` - Styling and responsive design

### Backend
- `src/web/server.js` - Route: `GET /nearby` serves the mini app
- `src/bot/handlers/nearby.js` - Telegram bot command handler

### Integration
- `src/bot/index.js` - Command registration and callback handlers

## Usage

### From Telegram Bot

Users can launch the mini app using:
```
/nearby
```

Or by sending a text message containing "nearby", "cercano", or "cerca"

### URL Access

Direct access (production with HTTPS):
```
https://your-domain.com/nearby
```

Development access:
```
http://localhost:3000/nearby
```

## API Endpoints Used

The mini app uses existing API endpoints:

1. **Get User Profile**
   - Endpoint: `GET /api/profile/:userId`
   - Purpose: Load user profile and membership status
   - Auth: Required (Telegram authentication)

2. **Get Nearby Users**
   - Endpoint: `POST /api/map/nearby`
   - Purpose: Fetch nearby users within specified radius
   - Body: `{ userId, latitude, longitude, radius }`
   - Auth: Required (Telegram authentication)

3. **Get Subscription Plans**
   - Endpoint: `GET /api/plans`
   - Purpose: Display available plans for upgrade
   - Auth: Not required

## Freemium Logic

### How It Works

1. **First-Time User**:
   - No unlocked chats
   - Can select any of the first 3 users in the list
   - Each selection unlocks that user permanently

2. **After 3 Free Chats**:
   - Remaining users show as locked
   - "Subscribe to unlock" message displayed
   - Upgrade button redirects to plans page

3. **Premium Subscribers**:
   - All users are unlocked
   - No chat limits
   - "Unlimited" shown in stats

### Storage

Free chat data is stored in localStorage:
```javascript
localStorage.setItem(`unlockedChats_${userId}`, JSON.stringify([...userIds]))
```

This ensures:
- Persistent tracking across sessions
- User-specific limits (keyed by userId)
- No server-side tracking needed for free tier

## Chat Integration

When a user clicks to chat:

1. **Check Unlock Status**: Verify if user can chat
2. **Unlock if Needed**: Add to unlocked list if free slots available
3. **Open Telegram**: Use Telegram WebApp API to open chat

```javascript
// By username
tg.openTelegramLink(`https://t.me/${username}`)

// By user ID
tg.openTelegramLink(`tg://user?id=${userId}`)
```

## Configuration

### Environment Variables

```bash
WEB_APP_URL=https://your-domain.com
TELEGRAM_TOKEN=your_bot_token
```

### Constants

In `nearby.js`:
```javascript
const FREE_CHAT_LIMIT = 3; // Number of free chats
```

## User Flow

1. **Launch**: User opens mini app via `/nearby` command
2. **Location**: App requests and gets user location
3. **Search**: Fetches nearby users with selected radius
4. **Browse**: User views list of nearby users
5. **Select**: User taps on a user card
6. **View Profile**: Modal shows detailed user information
7. **Chat Action**:
   - If unlocked: Opens Telegram chat
   - If lockable (free slots): Unlocks and opens chat
   - If locked: Shows upgrade prompt

## Design Considerations

### Mobile-First
- Optimized for mobile screens
- Touch-friendly buttons and cards
- Responsive layout adapts to all screen sizes

### Performance
- Lazy loading of user data
- Efficient state management
- Minimal re-renders

### User Experience
- Clear visual hierarchy
- Intuitive navigation
- Immediate feedback on actions
- Smooth animations and transitions

## Testing

### Local Testing

1. Start the web server:
```bash
npm run dev
```

2. Open in browser:
```
http://localhost:3000/nearby
```

3. Test features:
   - Location permission
   - User search with different radii
   - Chat locking/unlocking
   - Premium vs free user experience

### Production Testing

1. Deploy with HTTPS
2. Update WEB_APP_URL in environment
3. Test via Telegram bot
4. Verify Telegram authentication
5. Test chat redirection

## Future Enhancements

Potential features to add:

1. **Filters**: Filter by tier, activity, interests
2. **Favorites**: Save favorite nearby users
3. **Notifications**: Alert when new users are nearby
4. **Chat History**: Track chat interactions
5. **User Reviews**: Rate and review users
6. **Advanced Search**: More search criteria
7. **Map View**: Visual map with user locations
8. **Distance Alerts**: Notify when users get closer

## Troubleshooting

### Location Not Working
- Check browser permissions
- Ensure HTTPS in production
- Verify Telegram location API

### Chats Not Unlocking
- Clear localStorage
- Check console for errors
- Verify API responses

### Users Not Showing
- Check location data in database
- Verify geohash indexing
- Check search radius
- Ensure users have shared location

## Security

### Data Privacy
- User locations are only shared with consenting users
- Location data is approximate (not exact coordinates shown)
- Chat unlocks are stored locally (no server tracking)

### Authentication
- All API calls require Telegram authentication
- InitData validation prevents spoofing
- User ID verification on all endpoints

## Related Documentation

- [Main Mini App](./PRUEBAS_LOCALES_MINIAPP.md)
- [ePayco Integration](./CONFIGURACION_EPAYCO.md)
- [Deployment Guide](./DESPLIEGUE_PRODUCCION.md)
- [Testing Guide](../TESTING.md)
