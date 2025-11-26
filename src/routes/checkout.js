import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { getFxRate } from '../services/fxService.js';
import { createPaymentLink } from '../services/boldClient.js';
import { createOrderRecord } from '../services/orderService.js';
import { calculateUsdTotal, copFromUsd, resolveAddons, resolvePlan } from '../utils/pricing.js';

const router = Router();

const checkoutSchema = z.object({
  sku: z.string(),
  addons: z.array(z.string()).default([]),
  origin: z.string().default('web'),
  userId: z.string().uuid('userId must be a valid UUID'),
  customerEmail: z.string().email('Invalid email').optional(),
  customerName: z.string().min(1).optional(),
  telegramChatId: z.string().optional()
});

router.post('/', async (req, res, next) => {
  try {
    const input = checkoutSchema.parse(req.body);
    const plan = resolvePlan(input.sku);
    const addons = resolveAddons(input.addons || []);
    const fxRate = await getFxRate();
    const usdTotal = calculateUsdTotal(plan, addons);
    const amountCop = copFromUsd(usdTotal, fxRate);

    const orderId = uuid();
    const orderDescription = `${plan.label} (${plan.sku})`;
    const paymentResponse = await createPaymentLink({
      orderId,
      amountCop,
      description: orderDescription,
      origin: input.origin,
      metadata: {
        sku: plan.sku,
        addons: addons.map((addon) => addon.sku),
        telegramChatId: input.telegramChatId
      },
      customer: {
        id: input.userId,
        email: input.customerEmail,
        name: input.customerName
      }
    });

    const order = await createOrderRecord({
      orderId,
      userId: input.userId,
      sku: plan.sku,
      usdTotal,
      fxRate,
      amountCop,
      paymentLink: paymentResponse.url,
      origin: input.origin,
      telegramChatId: input.telegramChatId,
      addons: addons.map((addon) => addon.sku)
    });

    res.status(201).json({
      orderId: order.order_id,
      usdTotal,
      fxRate,
      amountCop,
      paymentUrl: paymentResponse.url,
      status: order.status
    });
  } catch (error) {
    next(error);
  }
});

export default router;
