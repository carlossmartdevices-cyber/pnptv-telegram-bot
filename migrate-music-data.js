const { db } = require("./src/config/firebase");

async function migrateMusicData() {
  console.log("🔄 Migrating music data to 'community-library' groupId...\n");

  try {
    // Get all music tracks
    const musicSnapshot = await db.collection('music').get();
    
    if (musicSnapshot.empty) {
      console.log("❌ No tracks found to migrate");
      return;
    }

    console.log(`📀 Found ${musicSnapshot.size} tracks to migrate:`);
    
    const batch = db.batch();
    let migratedCount = 0;

    musicSnapshot.forEach(doc => {
      const data = doc.data();
      const currentGroupId = data.groupId;
      
      console.log(`   - "${data.title}" by ${data.artist} (Current groupId: ${currentGroupId})`);
      
      // Update groupId to 'community-library'
      if (currentGroupId !== 'community-library') {
        batch.update(doc.ref, { groupId: 'community-library' });
        migratedCount++;
      }
    });

    // Get all playlists
    const playlistSnapshot = await db.collection('playlists').get();
    
    if (!playlistSnapshot.empty) {
      console.log(`\n📀 Found ${playlistSnapshot.size} playlists to migrate:`);
      
      playlistSnapshot.forEach(doc => {
        const data = doc.data();
        const currentGroupId = data.groupId;
        
        console.log(`   - "${data.name}" (Current groupId: ${currentGroupId})`);
        
        // Update groupId to 'community-library'
        if (currentGroupId !== 'community-library') {
          batch.update(doc.ref, { groupId: 'community-library' });
          migratedCount++;
        }
      });
    }

    if (migratedCount > 0) {
      console.log(`\n🔄 Migrating ${migratedCount} items...`);
      await batch.commit();
      console.log("✅ Migration completed successfully!");
    } else {
      console.log("\n✅ All items already have correct groupId");
    }

    // Verify migration
    console.log("\n🔍 Verifying migration...");
    const verifySnapshot = await db.collection('music')
      .where('groupId', '==', 'community-library')
      .get();
    
    console.log(`✅ Found ${verifySnapshot.size} tracks in 'community-library' after migration`);

    const verifyPlaylistSnapshot = await db.collection('playlists')
      .where('groupId', '==', 'community-library')
      .get();
    
    console.log(`✅ Found ${verifyPlaylistSnapshot.size} playlists in 'community-library' after migration`);

  } catch (error) {
    console.error("❌ Error during migration:", error);
  }

  process.exit(0);
}

migrateMusicData();