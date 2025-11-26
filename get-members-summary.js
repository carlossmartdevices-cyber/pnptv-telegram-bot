require('dotenv').config();
const { db } = require('./src/config/firebase');

async function getSummary() {
  console.log('📊 Quick Premium Members Summary\n');
  
  try {
    const users = await db.collection('users').where('tier', '!=', 'Free').limit(100).get();
    
    console.log(`Total Premium Members: ${users.size}\n`);
    
    let summary = {
      'Daimo': 0,
      'Manual': 0,
      'Other': 0,
      'Unknown': 0
    };
    
    // Check first 10 for payment methods
    let checked = 0;
    for (const doc of users.docs) {
      if (checked >= 10) break;
      
      const user = doc.data();
      const userId = doc.id;
      
      const payments = await db.collection('payments').where('userId', '==', userId).limit(1).get();
      
      if (payments.size > 0) {
        const p = payments.docs[0].data();
        if (p.daimoPaymentId || p.checkoutUrl?.includes('daimo')) {
          summary['Daimo']++;
          console.log(`✅ ${userId} - ${user.tier} - Daimo Payment ($${p.amount})`);
        } else {
          summary['Other']++;
          console.log(`💳 ${userId} - ${user.tier} - Other Payment ($${p.amount})`);
        }
      } else {
        summary['Unknown']++;
        console.log(`❓ ${userId} - ${user.tier} - No Payment Record (Manual?)`);
      }
      
      checked++;
    }
    
    console.log(`\n\nFirst ${checked} members checked.`);
    console.log('Summary of methods found:', summary);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

getSummary();
