const { db } = require("./src/config/firebase");

async function checkTrackDetails() {
  console.log("🔍 Checking track details with play counts...\n");

  try {
    const snapshot = await db.collection('music')
      .where('groupId', '==', 'community-library')
      .get();
    
    if (snapshot.empty) {
      console.log("❌ No tracks found");
      return;
    }

    console.log(`✅ Found ${snapshot.size} tracks:\n`);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`🎵 "${data.title}" by ${data.artist}`);
      console.log(`   🎯 Genre: ${data.genre}`);
      console.log(`   🔥 Play Count: ${data.playCount || 0}`);
      console.log(`   🔗 URL: ${data.url || 'No URL'}`);
      console.log(`   📅 Added: ${data.addedAt?.toDate?.() || data.addedAt}`);
      console.log(`   📊 ID: ${doc.id}\n`);
    });

  } catch (error) {
    console.error("❌ Error checking track details:", error);
  }

  process.exit(0);
}

checkTrackDetails();