import { Router } from 'express';

// Mock plans; replace from DB if needed
const PLANS = [
  { id: 'trial-pass', name: 'Trial Pass', price: '14.99', description: '7 days access', periodLabel: 'week' },
  { id: 'pnp-member', name: 'PNP Member', price: '24.99', description: '30 days access', periodLabel: 'month' },
  { id: 'crystal-member', name: 'Crystal Member', price: '49.99', description: '120 days access', periodLabel: '4 months' },
  { id: 'diamond-member', name: 'Diamond Member', price: '99.99', description: '365 days access', periodLabel: '1 year' },
];

const router = Router();

router.get('/:planId', (req, res) => {
  const plan = PLANS.find(p => p.id === req.params.planId);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
});

export default router;
