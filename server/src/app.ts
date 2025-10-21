import express from 'express';
import cors from 'cors';
import plans from './routes/plans';
import daimoWebhook from './routes/daimo-webhook';

const app = express();

app.use(cors({ origin: true }));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.use('/api/plans', plans);
app.use(daimoWebhook); // mounts /api/daimo/webhook

export default app;
