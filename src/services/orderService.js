import { v4 as uuid } from 'uuid';
import { pool, withTransaction } from '../db/index.js';
import { ORDER_STATUS } from '../constants/plans.js';
import { logger } from '../config/logger.js';

export const createOrderRecord = async ({
  orderId = uuid(),
  userId,
  sku,
  usdTotal,
  fxRate,
  amountCop,
  paymentLink,
  origin,
  telegramChatId,
  addons = []
}) => {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO orders
         (order_id, user_id, sku, usd_total, fx_usd_cop, amount_cop, payment_link, origin, telegram_chat_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
      [orderId, userId, sku, usdTotal, fxRate, amountCop, paymentLink, origin, telegramChatId || null]
    );

    if (addons.length) {
      const valuesClause = addons.map((_, index) => `($1, $${index + 2})`).join(',');
      await client.query(
        `INSERT INTO order_addons (order_id, addon_sku) VALUES ${valuesClause}`,
        [orderId, ...addons]
      );
    }

    return rows[0];
  });
};

export const updateOrderStatus = async ({ orderId, status, processed }) => {
  const query = {
    text: `UPDATE orders SET status = $2, processed = COALESCE($3, processed), updated_at = now()
           WHERE order_id = $1
           RETURNING *`,
    values: [orderId, status, processed]
  };
  const { rows } = await pool.query(query);
  return rows[0];
};

export const upsertSubscriptionFromOrder = async ({
  userId,
  plan,
  status,
  currentPeriodEnd,
  orderId
}) => {
  const query = {
    text: `INSERT INTO subscriptions (user_id, plan, status, current_period_end, last_order_id)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id)
           DO UPDATE SET plan = $2, status = $3, current_period_end = $4, last_order_id = $5, updated_at = now()
           RETURNING *`,
    values: [userId, plan, status, currentPeriodEnd, orderId]
  };
  const { rows } = await pool.query(query);
  return rows[0];
};

export const logWebhookEvent = async ({ eventType, orderId, rawPayload, signature, processedOk }) => {
  const query = {
    text: `INSERT INTO webhook_logs (id, event_type, order_id, raw_payload, signature, processed_ok)
           VALUES ($1, $2, $3, $4, $5, $6)`,
    values: [uuid(), eventType, orderId, rawPayload, signature || null, processedOk]
  };
  await pool.query(query);
};

export const handleApprovedOrder = async ({ order, planConfig, addons }) => {
  const totalDuration = planConfig.durationDays;
  const currentPeriodEnd = new Date(Date.now() + totalDuration * 24 * 60 * 60 * 1000);

  return withTransaction(async (client) => {
    await client.query(
      `UPDATE orders SET status = $2, processed = true, updated_at = now() WHERE order_id = $1`,
      [order.order_id, ORDER_STATUS.APPROVED]
    );

    await client.query(
      `INSERT INTO subscriptions (user_id, plan, status, current_period_end, last_order_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id)
       DO UPDATE SET plan = $2, status = $3, current_period_end = $4, last_order_id = $5, updated_at = now()`,
      [order.user_id, planConfig.sku, 'active', currentPeriodEnd, order.order_id]
    );

    if (addons?.length) {
      logger.info('Order approved with addons', addons.map((addon) => addon.sku).join(','));
    }

    return {
      subscriptionStatus: 'active',
      currentPeriodEnd
    };
  });
};

export const getOrderById = async (orderId) => {
  const { rows } = await pool.query('SELECT * FROM orders WHERE order_id = $1', [orderId]);
  return rows[0] || null;
};

export const getOrderAddons = async (orderId) => {
  const { rows } = await pool.query('SELECT addon_sku FROM order_addons WHERE order_id = $1', [orderId]);
  return rows.map((row) => row.addon_sku);
};
