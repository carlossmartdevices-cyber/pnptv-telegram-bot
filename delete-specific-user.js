require('dotenv').config();
const { db } = require('./src/config/firebase');

async function deleteSpecificUser() {
  const userId = '8552451957';
  
  try {
    console.log(`🔍 Buscando usuario ${userId}...`);
    
    // Verificar si existe
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log(`📋 Usuario encontrado:`);
      console.log(`   • ID: ${userId}`);
      console.log(`   • Nombre: ${userData.firstName || 'N/A'}`);
      console.log(`   • Username: @${userData.username || 'N/A'}`);
      console.log(`   • Tier: ${userData.tier || 'Free'}`);
      
      // Eliminar
      await db.collection('users').doc(userId).delete();
      console.log(`✅ Usuario ${userId} eliminado exitosamente`);
    } else {
      console.log(`❌ Usuario ${userId} no encontrado en la base de datos`);
      console.log(`✅ Esto significa que ya fue eliminado o nunca existió`);
    }
    
    // También eliminar posibles sesiones
    try {
      const sessionsSnapshot = await db.collection('bot_sessions')
        .where('userId', '==', userId)
        .get();
      
      if (!sessionsSnapshot.empty) {
        const batch = db.batch();
        sessionsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`🗑️ Eliminadas ${sessionsSnapshot.size} sesiones del usuario`);
      }
    } catch (sessionError) {
      console.log('⚠️ Error al eliminar sesiones:', sessionError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

deleteSpecificUser();
