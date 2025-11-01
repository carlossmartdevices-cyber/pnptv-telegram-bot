import { NextRequest, NextResponse } from 'next/server';

// Import plan service from main bot
const planService = require('../../../../../src/services/planService');

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching plans from planService...');
    
    // Get all active plans from the bot's plan service
    const plans = await planService.getActivePlans();
    
    if (!plans || plans.length === 0) {
      // Fallback to static plans if service fails
      const staticPlans = require('../../../../../src/config/plans');
      const plansList = Object.values(staticPlans).filter((plan: any) => plan.active && !plan.deprecated);
      
      console.log('Using fallback static plans:', plansList.length);
      return NextResponse.json({
        success: true,
        plans: plansList,
        source: 'static_fallback'
      });
    }

    console.log('Successfully fetched plans:', plans.length);
    
    // Transform plans for frontend consumption
    const transformedPlans = plans.map((plan: any) => ({
      id: plan.id,
      name: plan.name,
      displayName: plan.displayName || plan.name,
      description: plan.description || '',
      price: plan.price,
      priceInCOP: plan.priceInCOP,
      currency: plan.currency || 'USD',
      duration: plan.duration || plan.durationDays,
      durationDays: plan.durationDays || plan.duration,
      tier: plan.tier,
      features: plan.features || [],
      icon: plan.icon || '💎',
      active: plan.active
    }));

    return NextResponse.json({
      success: true,
      plans: transformedPlans,
      source: 'planService'
    });

  } catch (error) {
    console.error('Error fetching plans:', error);
    
    // Return static plans as fallback
    try {
      const staticPlans = require('../../../../../src/config/plans');
      const plansList = Object.values(staticPlans).filter((plan: any) => plan.active && !plan.deprecated);
      
      return NextResponse.json({
        success: true,
        plans: plansList,
        source: 'static_error_fallback',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } catch (fallbackError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to load plans',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}