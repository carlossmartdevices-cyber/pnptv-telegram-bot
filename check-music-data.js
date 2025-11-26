const { db } = require("./src/config/firebase");

async function checkMusicData() {
  console.log("🔍 Checking music library data...\n");

  try {
    // Check music collection
    console.log("📀 Music tracks:");
    const musicSnapshot = await db.collection('music').get();
    
    if (musicSnapshot.empty) {
      console.log("   ❌ No tracks found in music collection");
    } else {
      console.log(`   ✅ Found ${musicSnapshot.size} tracks:`);
      musicSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.title} by ${data.artist} (Group: ${data.groupId})`);
      });
    }

    console.log("\n📀 Playlists:");
    const playlistSnapshot = await db.collection('playlists').get();
    
    if (playlistSnapshot.empty) {
      console.log("   ❌ No playlists found");
    } else {
      console.log(`   ✅ Found ${playlistSnapshot.size} playlists:`);
      playlistSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.name} (Group: ${data.groupId}, Tracks: ${data.tracks?.length || 0})`);
      });
    }

    console.log("\n🔍 Checking for 'community-library' groupId specifically:");
    const communityTracksSnapshot = await db.collection('music')
      .where('groupId', '==', 'community-library')
      .get();
    
    if (communityTracksSnapshot.empty) {
      console.log("   ❌ No tracks found with groupId 'community-library'");
    } else {
      console.log(`   ✅ Found ${communityTracksSnapshot.size} tracks in community library:`);
      communityTracksSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.title} by ${data.artist} (ID: ${doc.id})`);
      });
    }

    console.log("\n🔍 Checking for other groupIds:");
    const allGroupIds = new Set();
    musicSnapshot.forEach(doc => {
      const groupId = doc.data().groupId;
      if (groupId) allGroupIds.add(groupId);
    });

    if (allGroupIds.size > 0) {
      console.log("   📍 Found these groupIds:", Array.from(allGroupIds));
    } else {
      console.log("   ❌ No groupIds found in tracks");
    }

  } catch (error) {
    console.error("❌ Error checking data:", error);
  }

  process.exit(0);
}

checkMusicData();