import { Router } from 'express';
import { verifyBoldSignature } from '../services/boldClient.js';
import {
  getOrderById,
  getOrderAddons,
  handleApprovedOrder,
  logWebhookEvent,
  updateOrderStatus
} from '../services/orderService.js';
import { resolvePlan, resolveAddons } from '../utils/pricing.js';
import { ORDER_STATUS } from '../constants/plans.js';
import { logger } from '../config/logger.js';
import { notifyPaymentApproved } from '../services/telegramNotifier.js';

const router = Router();

const parseBody = (req) => {
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString('utf8'));
    } catch (error) {
      logger.error('Unable to parse Bold webhook payload', error);
      return null;
    }
  }
  return req.body;
};

const mapStatus = (boldStatus) => {
  switch (boldStatus) {
    case 'approved':
      return ORDER_STATUS.APPROVED;
    case 'failed':
      return ORDER_STATUS.FAILED;
    case 'expired':
      return ORDER_STATUS.EXPIRED;
    case 'refunded':
      return ORDER_STATUS.REFUNDED;
    default:
      return ORDER_STATUS.PENDING;
  }
};

router.post('/bold', async (req, res) => {
  const signature = req.get('X-Bold-Signature') || req.get('x-bold-signature');
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

  const payload = parseBody(req);
  if (!payload) {
    return res.status(400).json({ error: 'invalid payload' });
  }

  const verified = verifyBoldSignature(rawBody, signature);
  if (!verified) {
    logger.warn('Invalid Bold signature');
    return res.status(400).json({ error: 'invalid signature' });
  }

  const orderId = payload?.reference;
  const status = payload?.status;
  let addons = Array.isArray(payload?.metadata?.addons) ? payload.metadata.addons : null;

  if (!orderId) {
    logger.error('Bold webhook missing order reference');
    return res.status(422).json({ error: 'missing reference' });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    logger.error('Order not found for webhook', orderId);
    await logWebhookEvent({
      eventType: payload?.event || 'unknown',
      orderId,
      rawPayload: payload,
      signature,
      processedOk: false
    });
    return res.status(404).json({ error: 'order not found' });
  }

  const mappedStatus = mapStatus(status);

  try {
    if (!addons) {
      addons = await getOrderAddons(orderId);
    }
    if (mappedStatus === ORDER_STATUS.APPROVED && !order.processed) {
      const planConfig = resolvePlan(order.sku);
      const addonConfigs = resolveAddons(addons);
      const activation = await handleApprovedOrder({ order, planConfig, addons: addonConfigs });
      await notifyPaymentApproved({
        chatId: order.telegram_chat_id || payload?.metadata?.telegramChatId,
        sku: planConfig.sku,
        currentPeriodEnd: activation.currentPeriodEnd
      });
      await logWebhookEvent({
        eventType: payload?.event || 'payment.approved',
        orderId,
        rawPayload: payload,
        signature,
        processedOk: true
      });
    } else {
      await updateOrderStatus({ orderId, status: mappedStatus, processed: mappedStatus === ORDER_STATUS.APPROVED });
      await logWebhookEvent({
        eventType: payload?.event || 'payment.status',
        orderId,
        rawPayload: payload,
        signature,
        processedOk: true
      });
    }
  } catch (error) {
    logger.error('Failed processing Bold webhook', error);
    await logWebhookEvent({
      eventType: payload?.event || 'error',
      orderId,
      rawPayload: payload,
      signature,
      processedOk: false
    });
    return res.status(500).json({ error: 'webhook processing failed' });
  }

  return res.status(200).json({ received: true });
});

export default router;
