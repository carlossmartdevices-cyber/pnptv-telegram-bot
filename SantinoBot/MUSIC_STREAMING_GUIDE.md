# 🎵 Music & Podcast Streaming Guide

## Overview

Your Santino Group Bot now supports music and podcast streaming features! This allows you to:
- 📚 Build a music/podcast library
- 📀 Create and manage playlists
- 🎙️ Schedule live broadcasts and DJ sets
- 📊 Track listening statistics
- 🔔 Auto-notify members of upcoming shows

---

## 🎵 Features

### 1. **Music Library**
Store and organize tracks with metadata (title, artist, genre, etc.)

### 2. **Playlists**
Create themed collections of tracks

### 3. **Scheduled Broadcasts**
Schedule music sessions, podcasts, and live DJ sets with automatic reminders

### 4. **Playback Tracking**
Monitor which tracks are most popular

### 5. **Auto-Notifications**
Members get notified 15 minutes before scheduled broadcasts

---

## 📝 Commands

### **User Commands** (Everyone)

#### `/library [filter]`
View the music library
```
/library              # All tracks
/library music        # Only music
/library podcast      # Only podcasts
```

#### `/toptracks`
See the 10 most played tracks
```
/toptracks
```

#### `/upcomingmusic`
View scheduled music broadcasts
```
/upcomingmusic
```

---

### **Admin/Diamond Commands**

#### `/addtrack`
Add music or podcast to the library

**Method 1: With Audio File**
1. Upload an audio file to the group
2. Reply to it with:
```
/addtrack
Title: Song Name
Artist: Artist Name
Type: music
Genre: Rock
```

**Method 2: With External Link**
```
/addtrack
Title: My Podcast Episode
Artist: Host Name
Type: podcast
Genre: Comedy
URL: https://soundcloud.com/your-track
```

**Track Types:**
- `music` - Songs, instrumentals
- `podcast` - Podcast episodes, talk shows

**Genres:**
Rock, Jazz, Electronic, Hip-Hop, Pop, Classical, Metal, Reggae, Blues, Country, Folk, R&B, Soul, Funk, Disco, House, Techno, Trance, Dubstep, Comedy, News, Education, Sports, True Crime, Business, etc.

---

#### `/playlist`
Create or view playlists

**Create a playlist:**
```
/playlist
Name: Chill Vibes
Description: Late night relaxing music
Tracks: track_xyz123,track_abc456,track_def789
```

**View a playlist:**
```
/playlist playlist_1234567890
```

**Tips:**
- Get track IDs from `/library` command
- Separate multiple track IDs with commas
- You can edit playlists by creating with the same name

---

#### `/schedulemusic`
Schedule a music broadcast, podcast, or live DJ set

**Example 1: Music Playlist Broadcast**
```
/schedulemusic
Title: Friday Night Mix
Type: music
Time: 2025-11-08 20:00
Host: DJ Santino
Playlist: playlist_1234567890
Description: The best club hits to start your weekend!
```

**Example 2: Podcast Episode**
```
/schedulemusic
Title: Episode 42: The Truth
Type: podcast
Time: 2025-11-09 18:00
Host: Santino
Description: Deep dive into controversial topics
```

**Example 3: Live DJ Set**
```
/schedulemusic
Title: Live Saturday Techno
Type: live_dj
Time: 2025-11-10 22:00
Host: DJ Alpha
StreamURL: https://youtu.be/your-live-stream
Description: 4-hour techno marathon! 🎧
```

**Broadcast Types:**
- `music` - Pre-recorded music playlist
- `podcast` - Podcast episode
- `live_dj` - Live DJ performance (requires StreamURL)

**Time Format:** `YYYY-MM-DD HH:MM` (24-hour format)

---

## 🔄 How It Works

### **Adding Tracks**

1. **Upload Audio Files** (MP3, M4A, OGG)
   - Max 50MB per file (2GB with Telegram Premium)
   - Bot stores Telegram's `file_id` for instant playback
   - Can be played directly in Telegram

2. **Add External Links**
   - SoundCloud, Mixcloud, YouTube, Spotify, etc.
   - Members click link to listen on platform
   - Great for podcasts and long-form content

### **Scheduling Broadcasts**

1. Admin/Diamond member creates broadcast with `/schedulemusic`
2. Bot stores in Firebase database
3. **15 minutes before** broadcast time:
   - Bot automatically sends notification to group
   - Notification includes title, host, time, and link (if live)
4. Members see reminder and can join on time

### **Auto-Notifications**

The bot checks every 5 minutes for upcoming broadcasts:
- If broadcast is within 15 minutes
- And notification hasn't been sent yet
- Sends "STARTING SOON!" message to group

---

## 💡 Use Cases

### **🎧 Weekly DJ Sets**
Schedule recurring live DJ performances
```
Every Saturday at 10 PM - Live Techno Session
Host provides YouTube/Twitch stream link
Members get notified 15 min before
```

### **🎙️ Daily Podcast Episodes**
Share your podcast with the community
```
Monday-Friday at 9 AM - Morning News Podcast
Upload episode audio files
Auto-notification at 8:45 AM
```

### **🎵 Themed Playlists**
Curate music collections for different moods
```
"Workout Motivation" - High-energy tracks
"Study Focus" - Ambient/Lo-fi music
"Party Hits" - Club bangers
```

### **📻 Radio Show Schedule**
Create a full broadcast schedule
```
Mon 7 PM - Rock Classics
Tue 8 PM - Jazz Night
Wed 9 PM - Electronic Underground
Thu 7 PM - Hip-Hop Hour
Fri 10 PM - Weekend Party Mix
```

---

## 🗄️ Firebase Data Structure

All data is stored in Firebase Firestore:

### **Collections:**

#### `music` - Track Library
```javascript
{
  trackId: "track_1699123456789_abc123",
  groupId: "-1003291737499",
  title: "Midnight Dreams",
  artist: "DJ Santino",
  genre: "Electronic",
  type: "music",
  duration: 240,  // seconds
  fileId: "BQACAgIAAxkBAAI...",  // Telegram file_id
  url: "https://soundcloud.com/...",  // or external URL
  addedBy: "123456789",
  addedAt: Timestamp,
  playCount: 42,
  lastPlayed: Timestamp,
  isActive: true
}
```

#### `playlists` - Playlist Collections
```javascript
{
  playlistId: "playlist_1699123456789",
  groupId: "-1003291737499",
  name: "Chill Vibes",
  description: "Late night relaxing music",
  tracks: ["track_123", "track_456", "track_789"],
  createdBy: "123456789",
  createdAt: Timestamp,
  isPublic: true,
  playCount: 15
}
```

#### `scheduled_broadcasts` - Upcoming Shows
```javascript
{
  broadcastId: "broadcast_1699123456789",
  groupId: "-1003291737499",
  title: "Friday Night Mix",
  type: "live_dj",  // music, podcast, live_dj
  playlistId: "playlist_123",  // optional
  trackIds: ["track_1", "track_2"],  // optional
  description: "The best club hits!",
  scheduledTime: Timestamp,
  hostId: "123456789",
  hostName: "DJ Santino",
  isLive: true,
  streamUrl: "https://youtube.com/live/...",
  status: "scheduled",  // scheduled, live, completed, cancelled
  notificationSent: false,
  createdAt: Timestamp
}
```

---

## 🎯 Example Workflow

### **Setting Up a Music Broadcast**

1. **Build Library**
```
# Add some tracks
/addtrack
Title: Track 1
Artist: Artist A
Type: music
Genre: Electronic
URL: https://soundcloud.com/track1

/addtrack
Title: Track 2
Artist: Artist B
Type: music
Genre: Electronic
URL: https://soundcloud.com/track2
```

2. **Create Playlist**
```
/playlist
Name: Electronic Night
Description: Best electronic tracks
Tracks: track_xyz123,track_abc456
```

3. **Schedule Broadcast**
```
/schedulemusic
Title: Electronic Saturday
Type: music
Time: 2025-11-09 21:00
Host: DJ Santino
Playlist: playlist_1699123456789
Description: Dance all night! 🎉
```

4. **Wait for Auto-Notification**
   - At 8:45 PM, bot sends reminder to group
   - Members see playlist and join at 9 PM

---

## 🔧 Advanced Features

### **Track Play Counting**
Every time a track is played, call:
```javascript
await musicService.trackPlay(trackId);
```
This increments `playCount` and updates `lastPlayed`

### **Top Tracks Analytics**
Use `/toptracks` to see:
- Most popular songs
- Community favorites
- Trending content

### **Broadcast Status Management**
Update broadcast status:
```javascript
// When going live
await db.collection('scheduled_broadcasts').doc(broadcastId).update({
  status: 'live'
});

// When finished
await db.collection('scheduled_broadcasts').doc(broadcastId).update({
  status: 'completed'
});
```

---

## 🎨 Customization Ideas

### **Genre-Based Filtering**
Add genre filters to library view

### **User Requests**
Let users request songs for upcoming broadcasts

### **Vote System**
Members vote on next playlist/broadcast theme

### **Now Playing**
Show currently playing track in group

### **DJ Profiles**
Store DJ/host profiles with bio and photo

### **Recurring Events**
Auto-schedule weekly shows

---

## 🚀 Getting Started

1. **Add your first track:**
   ```
   /addtrack
   Title: Test Song
   Artist: Test Artist
   Type: music
   Genre: Rock
   URL: https://example.com/song.mp3
   ```

2. **View the library:**
   ```
   /library
   ```

3. **Schedule a test broadcast:**
   ```
   /schedulemusic
   Title: Test Broadcast
   Type: music
   Time: 2025-11-02 15:00
   Host: Me
   Description: Testing the system
   ```

4. **Check upcoming:**
   ```
   /upcomingmusic
   ```

---

## ✅ System Status

🟢 **Music Service:** Active  
🟢 **Notification Scheduler:** Running (checks every 5 minutes)  
🟢 **Firebase Integration:** Connected  
🟢 **Commands:** 6 music commands available  

---

## 📚 Resources

- **Audio Formats Supported:** MP3, M4A, OGG, FLAC
- **Max File Size:** 50MB (standard), 2GB (Premium)
- **Streaming Platforms:** SoundCloud, Mixcloud, YouTube, Spotify, Apple Music
- **Notification Window:** 15 minutes before broadcast
- **Scheduler Frequency:** Every 5 minutes

---

## 🎉 Ready to Rock!

Your bot now has a complete music and podcast streaming system. Start building your library, create playlists, and schedule your first broadcast!

**Questions?** Use `/help` in the group to see all available commands.

---

**Enjoy your music streaming features! 🎵🎧🎉**
