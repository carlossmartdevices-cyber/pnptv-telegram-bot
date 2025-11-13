require('dotenv').config();
const { db } = require('./src/config/firebase');

function formatDate(timestamp) {
  try {
    if (!timestamp) return 'N/A';
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toISOString().split('T')[0];
    }
    if (timestamp._seconds) {
      return new Date(timestamp._seconds * 1000).toISOString().split('T')[0];
    }
    if (timestamp instanceof Date) {
      return timestamp.toISOString().split('T')[0];
    }
    return String(timestamp).split('T')[0] || 'N/A';
  } catch (e) {
    return 'N/A';
  }
}

async function analyzeMemberActivation() {
  console.log('📊 Prime Member Activation Analysis\n');
  
  try {
    // Get all premium members
    const usersSnapshot = await db.collection('users')
      .where('tier', '!=', 'Free')
      .get();
    
    console.log(`Total Premium Members: ${usersSnapshot.size}\n`);
    
    let activationMethods = {
      'Daimo (USDC)': 0,
      'Manual Admin': 0,
      'System': 0,
      'Unknown': 0
    };
    
    const memberDetails = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const userId = userDoc.id;
      
      let activationMethod = 'Unknown';
      let paymentDetails = null;
      
      const paymentsSnapshot = await db.collection('payments')
        .where('userId', '==', userId)
        .get();
      
      if (paymentsSnapshot.size > 0) {
        let mostRecent = null;
        paymentsSnapshot.docs.forEach(doc => {
          const p = doc.data();
          if (!mostRecent || (p.createdAt && p.createdAt > mostRecent.createdAt)) {
            mostRecent = p;
          }
        });
        
        if (mostRecent) {
          paymentDetails = mostRecent;
          
          if (mostRecent.daimoPaymentId || mostRecent.checkoutUrl?.includes('daimo')) {
            activationMethod = 'Daimo (USDC)';
          } else if (mostRecent.provider === 'daimo') {
            activationMethod = 'Daimo (USDC)';
          } else if (mostRecent.manual) {
            activationMethod = 'Manual Admin';
          } else {
            activationMethod = 'Payment API';
          }
        }
      } else {
        if (user.activatedBy || user.manualActivation) {
          activationMethod = 'Manual Admin';
        }
      }
      
      activationMethods[activationMethod]++;
      
      memberDetails.push({
        userId,
        username: user.username || user.name || 'N/A',
        tier: user.tier,
        email: user.email || 'N/A',
        activationMethod,
        membershipExpiresAt: formatDate(user.membershipExpiresAt),
        paymentId: paymentDetails?.id || 'N/A',
        paymentAmount: paymentDetails?.amount || 'N/A',
        paymentStatus: paymentDetails?.status || 'N/A',
        activatedAt: formatDate(user.activatedAt)
      });
    }
    
    memberDetails.sort((a, b) => {
      const methodOrder = { 'Daimo (USDC)': 0, 'Manual Admin': 1, 'Payment API': 2, 'Unknown': 3 };
      return methodOrder[a.activationMethod] - methodOrder[b.activationMethod];
    });
    
    console.log('📈 ACTIVATION METHOD BREAKDOWN:\n');
    Object.entries(activationMethods).forEach(([method, count]) => {
      const percentage = ((count / usersSnapshot.size) * 100).toFixed(1);
      console.log(`${method.padEnd(20)} : ${String(count).padEnd(3)} members (${percentage}%)`);
    });
    
    console.log('\n' + '='.repeat(120));
    
    let currentMethod = '';
    memberDetails.forEach((member, index) => {
      if (member.activationMethod !== currentMethod) {
        currentMethod = member.activationMethod;
        console.log(`\n🟢 ${currentMethod.toUpperCase()}\n`);
      }
      
      console.log(`${index + 1}. User ID: ${member.userId}`);
      console.log(`   Name: ${member.username} | Tier: ${member.tier}`);
      console.log(`   Email: ${member.email}`);
      console.log(`   Expires: ${member.membershipExpiresAt} | Activated: ${member.activatedAt}`);
      
      if (member.paymentId !== 'N/A') {
        console.log(`   💳 Payment: ${member.paymentId} | Amount: $${member.paymentAmount} | Status: ${member.paymentStatus}`);
      }
      console.log('');
    });
    
    console.log('='.repeat(120));
    
    const csv = 'User ID,Username,Tier,Email,Activation Method,Membership Expires,Payment Amount,Payment Status,Activated Date\n' +
      memberDetails.map(m => 
        `${m.userId},"${m.username}","${m.tier}","${m.email}","${m.activationMethod}",${m.membershipExpiresAt},"$${m.paymentAmount}",${m.paymentStatus},${m.activatedAt}`
      ).join('\n');
    
    require('fs').writeFileSync('prime-members-activation.csv', csv);
    console.log('\n✅ CSV exported to: prime-members-activation.csv\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

analyzeMemberActivation();
