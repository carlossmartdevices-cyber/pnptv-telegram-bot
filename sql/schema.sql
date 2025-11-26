CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS orders (
  order_id        UUID PRIMARY KEY,
  user_id         UUID NOT NULL,
  sku             TEXT NOT NULL,
  usd_total       NUMERIC(10,2) NOT NULL,
  fx_usd_cop      NUMERIC(10,4) NOT NULL,
  amount_cop      INTEGER NOT NULL,
  payment_link    TEXT NOT NULL,
  origin          TEXT NOT NULL,
  telegram_chat_id TEXT,
  status          TEXT NOT NULL DEFAULT 'created',
  processed       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id             UUID PRIMARY KEY,
  plan                TEXT NOT NULL,
  status              TEXT NOT NULL,
  current_period_end  TIMESTAMPTZ NOT NULL,
  last_order_id       UUID REFERENCES orders(order_id),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id            UUID PRIMARY KEY,
  event_type    TEXT NOT NULL,
  order_id      UUID,
  raw_payload   JSONB NOT NULL,
  signature     TEXT,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_ok  BOOLEAN
);

CREATE TABLE IF NOT EXISTS order_addons (
  order_id   UUID REFERENCES orders(order_id) ON DELETE CASCADE,
  addon_sku  TEXT NOT NULL,
  PRIMARY KEY (order_id, addon_sku)
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trigger_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trigger_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
