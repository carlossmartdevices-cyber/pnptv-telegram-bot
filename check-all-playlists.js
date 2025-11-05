const { db } = require("./src/config/firebase");

async function checkAllPlaylists() {
  console.log("🔍 Checking ALL playlists in database...\n");

  try {
    // Get ALL playlists without any filters
    const playlistSnapshot = await db.collection('playlists').get();
    
    if (playlistSnapshot.empty) {
      console.log("❌ No playlists found in the entire database");
      console.log("   This means your playlist was either:");
      console.log("   1. Never successfully created");
      console.log("   2. Deleted somehow");
      console.log("   3. Stored in a different collection");
    } else {
      console.log(`✅ Found ${playlistSnapshot.size} playlists total:`);
      playlistSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`\n📀 Playlist: "${data.name}"`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   GroupId: ${data.groupId}`);
        console.log(`   Created by: ${data.createdBy}`);
        console.log(`   Created at: ${data.createdAt?.toDate?.() || data.createdAt}`);
        console.log(`   Tracks: ${data.tracks?.length || 0}`);
        if (data.tracks && data.tracks.length > 0) {
          console.log(`   Track IDs: ${data.tracks.join(', ')}`);
        }
      });
    }

    // Also check if there are any other collections that might contain playlist data
    console.log("\n🔍 Checking other possible collections...");
    
    // Check if there's a 'music_playlists' collection
    const altPlaylistSnapshot = await db.collection('music_playlists').get();
    if (!altPlaylistSnapshot.empty) {
      console.log(`✅ Found ${altPlaylistSnapshot.size} items in 'music_playlists' collection`);
    }

    // Check if playlists are stored within user documents
    const usersSnapshot = await db.collection('users').limit(5).get();
    let foundPlaylistData = false;
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.playlists) {
        console.log(`✅ Found playlist data in user ${doc.id}:`, userData.playlists);
        foundPlaylistData = true;
      }
    });

    if (!foundPlaylistData) {
      console.log("❌ No playlist data found in user documents");
    }

  } catch (error) {
    console.error("❌ Error checking playlists:", error);
  }

  process.exit(0);
}

checkAllPlaylists();