import { Router } from 'express';
import { getOrderById } from '../services/orderService.js';

const router = Router();

router.get('/:orderId', async (req, res, next) => {
  try {
    const order = await getOrderById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'order not found' });
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
});

export default router;
