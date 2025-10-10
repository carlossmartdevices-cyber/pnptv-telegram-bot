import express from 'express';
import checkoutRouter from './routes/checkout.js';
import ordersRouter from './routes/orders.js';
import webhooksRouter from './routes/webhooks.js';
import { logger } from './config/logger.js';

const app = express();

app.use('/api/webhooks/bold', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use('/api/checkout', checkoutRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/webhooks', webhooksRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'internal server error' });
});

export default app;
