# PNPtv Telegram Bot & Bold.co Payments

Implementación de backend y bot de Telegram para PNPtv con cobros a través de Bold.co, FX cacheado USD→COP y activación de beneficios por webhooks.

## Requisitos

- Node.js 18+
- PostgreSQL 13+
- Cuenta Bold.co con API Key

## Configuración

1. Duplica `.env.example` a `.env` y completa las variables.
2. Ejecuta `npm install`.
3. Inicializa la base de datos ejecutando los SQL de `sql/schema.sql` (incluye tablas `orders`, `subscriptions`, `order_addons` y `webhook_logs`).
4. Inicia el servidor + bot con `npm run dev`.

## Endpoints

- `POST /api/checkout`: Crea orden y genera link de pago Bold.
- `GET /api/orders/:orderId`: Obtiene estado de una orden.
- `POST /api/webhooks/bold`: Webhook de confirmación Bold (requiere firma HMAC SHA-256).

## Flujo de Pago

1. Frontend/mini app pide precios en USD, envía checkout con SKU y addons.
2. Backend obtiene tasa FX cacheada, calcula COP y crea link en Bold.
3. Usuario paga en Bold, webhook llega al backend.
4. Se valida firma, se activa suscripción y se registran logs idempotentes.

## Telegram Bot

- Comando `/start` muestra planes y botones para iniciar checkout.
- Soporta selección de addons y genera link Bold directo desde Telegram.
- Utiliza sesiones locales para carrito temporal.
- Comando `/share` habilita el viral loop “Comparte y gana Stars”.

## Checklist QA (manual)

1. Suscripción Silver aprobada activa beneficios.
2. Golden + Plus calcula COP correcto.
3. Boost aplica destacado (ver logs). 
4. Webhooks repetidos no duplican beneficios (usa `processed` en orden).
5. Estados `failed/expired` no activan plan.
6. Reembolsos cambian estado a `refunded`.
7. Mini App abre link Bold y regresa correctamente.
8. Notificación Telegram puede enviarse tras aprobación (hook para implementar según necesidad).

## Scripts útiles

- `npm run dev`: nodemon del servidor + bot.
- `npm run bot`: lanza solo el bot.

