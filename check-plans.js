const planService = require('./src/services/planService.js');
const { db } = require('./src/config/firebase.js');

async function checkAndFixPlans() {
  try {
    const plans = await planService.getAllPlans();
    console.log('Checking all plans for issues...');
    
    let issuesFound = false;
    
    for (const plan of plans) {
      if (!plan.price || plan.price === undefined || plan.price === null) {
        console.log(`❌ Plan "${plan.name}" (ID: ${plan.id}) has invalid price: ${plan.price}`);
        issuesFound = true;
        
        // Fix the plan if it's the Test Plan
        if (plan.name === 'Test Plan') {
          console.log('Fixing Test Plan...');
          await db.collection('plans').doc(plan.id).update({
            price: 0.01,
            priceInCOP: 40,
            currency: 'USD'
          });
          console.log('✅ Test Plan fixed');
        }
      } else {
        console.log(`✅ Plan "${plan.name}" price: $${plan.price} ${plan.currency || 'USD'}`);
      }
      
      if (!plan.durationDays && !plan.duration) {
        console.log(`❌ Plan "${plan.name}" has no duration specified`);
        issuesFound = true;
      }
    }
    
    if (!issuesFound) {
      console.log('✅ All plans look good!');
    } else {
      console.log('⚠️  Issues found and fixed');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAndFixPlans();