import axios from 'axios';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const BOLD_BASE_URL = process.env.BOLD_API_BASE || 'https://api.bold.co';

const http = axios.create({
  baseURL: BOLD_BASE_URL,
  headers: {
    Authorization: `Bearer ${env.bold.apiKey}`,
    'Content-Type': 'application/json'
  },
  timeout: 10_000
});

export const createPaymentLink = async ({
  orderId,
  amountCop,
  description,
  customer,
  origin,
  metadata = {}
}) => {
  const payload = {
    reference: orderId,
    amount: amountCop,
    currency: 'COP',
    description,
    redirectUrl: env.bold.redirectUrl,
    callbackUrl: env.bold.callbackUrl,
    metadata: {
      origin,
      userId: customer?.id || null,
      ...metadata
    }
  };

  logger.info('Creating Bold payment link', payload.reference, amountCop);
  const { data } = await http.post('/payments', payload);
  if (!data?.url) {
    throw new Error('Bold payment link missing URL');
  }
  return data;
};

export const verifyBoldSignature = (rawBody, signature) => {
  if (!signature) {
    return false;
  }
  const hmac = crypto.createHmac('sha256', env.bold.apiKey);
  hmac.update(rawBody);
  const expected = hmac.digest('hex');
  try {
    const provided = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (provided.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(provided, expectedBuffer);
  } catch (error) {
    return false;
  }
};
