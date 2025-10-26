/**
 * Webhook mode configuration for production deployment
 * Optimized for Railway deployment with health checks and graceful shutdown
 */

require("../config/env");
const express = require("express");
const { Telegraf } = require("telegraf");
const logger = require("../utils/logger");
const daimo = require("../config/daimo");
const { db } = require("../config/firebase");

// Initialize bot
const bot = require("./index");

// Express app for webhook
const app = express();

// Trust Railway proxy
app.set("trust proxy", 1);

// JSON body parser with size limits
app.use(express.json({ limit: "10mb" }));

// Request logging middleware (production optimized)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path !== "/health") {
      logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "PNPtv Telegram Bot",
    status: "running",
    version: process.env.npm_package_version || "2.0.0",
    environment: process.env.NODE_ENV || "production",
  });
});

// Enhanced health check endpoint for Railway
app.get("/health", (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || "production",
  };
  res.json(health);
});

// Readiness check (checks if bot is connected)
app.get("/ready", async (req, res) => {
  try {
    const botInfo = await bot.telegram.getMe();
    res.json({
      ready: true,
      bot: {
        id: botInfo.id,
        username: botInfo.username,
        firstName: botInfo.first_name,
      },
    });
  } catch (error) {
    logger.error("Readiness check failed:", error);
    res.status(503).json({
      ready: false,
      error: error.message,
    });
  }
});

// API routes for payment page
const apiRoutes = require('./api/routes');
app.use('/api', apiRoutes);

// Payment page endpoint for Daimo Pay
app.get("/pay", async (req, res) => {
  try {
    const { plan, user, amount } = req.query;

    if (!plan || !user || !amount) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Payment Link</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 400px;
            }
            .icon { font-size: 64px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">⚠️</div>
            <h1>Invalid Payment Link</h1>
            <p>This payment link is missing required information. Please return to the bot and try again.</p>
          </div>
        </body>
        </html>
      `);
    }

    logger.info("Payment page accessed:", { plan, user, amount });

    // Fetch plan details to show on payment page
    const planService = require('../services/planService');
    let planData;
    try {
      planData = await planService.getPlanById(plan);
    } catch (err) {
      logger.error("Failed to fetch plan:", err);
    }

    const planName = planData?.displayName || planData?.name || 'Premium Plan';
    const planDescription = planData?.description || 'Premium subscription';

    // Serve Daimo payment page
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Complete Payment - PNPtv! Digital Community</title>
        <meta name="description" content="Complete your PNPtv subscription payment securely via Daimo Pay">
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Source+Code+Pro:wght@400;600&display=swap" rel="stylesheet">
        <style>
          :root {
            --bg: #28282B;
            --panel: #2F2F33;
            --text: #EAEAF0;
            --muted: #C6C6CD;
            --primary: #6A40A7;
            --accent: #DF00FF;
            --link: #DF00FF;
            --border: #3A3A40;
            --radius: 22px;
            --shadow: 0 8px 22px rgba(0,0,0,0.25);
          }
          * { box-sizing: border-box; }
          html, body {
            margin: 0; padding: 0;
            background: var(--bg); color: var(--text);
            font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
          }
          h1, h2, h3 { font-family: 'Space Grotesk', Inter, system-ui, sans-serif; }
          code, pre { font-family: 'Source Code Pro', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; }
          a { color: var(--link); text-decoration: none; }
          a:hover { text-decoration: underline; }
          .container { max-width: 980px; margin: 0 auto; padding: 28px; }
          header {
            background: linear-gradient(180deg, rgba(106,64,167,0.18), rgba(223,0,255,0.06));
            border-bottom: 1px solid var(--border);
            box-shadow: 0 6px 18px rgba(106,64,167,0.25);
          }
          header .container { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
          .brand { display:flex; align-items:center; gap:12px; }
          .badge {
            background: rgba(223,0,255,0.10);
            color: var(--accent);
            border: 1px solid rgba(223,0,255,0.35);
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 12px; font-weight: 700; letter-spacing: .3px;
          }
          .chip { display:inline-block; background:#232329; border:1px solid var(--border); padding:6px 10px; border-radius:10px; font-size:12px; color:var(--muted);}
          main { min-height: 60vh; }
          .payment-section {
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 40px;
            margin: 30px auto;
            box-shadow: var(--shadow);
            max-width: 600px;
          }
          .payment-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--border);
          }
          .logo { font-size: 48px; margin-bottom: 10px; }
          h1 { font-size: 30px; margin: 14px 0 6px; }
          .subtitle { color: var(--muted); font-size: 14px; }
          .plan-info {
            background: rgba(106,64,167,0.12);
            border: 1px solid rgba(223,0,255,0.2);
            padding: 24px;
            border-radius: 18px;
            margin-bottom: 30px;
          }
          .plan-info h2 {
            color: var(--accent);
            font-size: 22px;
            margin-bottom: 12px;
            font-weight: 600;
          }
          .plan-info p {
            color: var(--muted);
            line-height: 1.6;
            margin-bottom: 18px;
            font-size: 15px;
          }
          .price {
            font-size: 42px;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 5px;
            font-family: 'Space Grotesk', sans-serif;
          }
          .currency {
            font-size: 16px;
            color: var(--muted);
            font-weight: 500;
          }
          #daimo-pay-container {
            margin-top: 24px;
          }
          .pay-button {
            width: 100%;
            padding: 16px 24px;
            background: linear-gradient(135deg, var(--primary), var(--accent));
            color: #ffffff;
            border: none;
            border-radius: 14px;
            font-size: 18px;
            font-weight: 700;
            font-family: 'Space Grotesk', sans-serif;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 6px 20px rgba(223,0,255,0.25);
          }
          .pay-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(223,0,255,0.35);
          }
          .pay-button:disabled {
            background: #3A3A40;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
            color: var(--muted);
          }
          .loading {
            text-align: center;
            color: var(--muted);
            margin-top: 20px;
            font-size: 14px;
          }
          .error {
            background: rgba(255,59,48,0.15);
            color: #ff6b6b;
            border: 1px solid rgba(255,59,48,0.3);
            padding: 16px;
            border-radius: 12px;
            margin-top: 20px;
            display: none;
            font-size: 14px;
          }
          .security-note {
            text-align: center;
            color: var(--muted);
            font-size: 13px;
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid var(--border);
          }
          footer {
            color: var(--muted);
            font-size: 14px;
            border-top: 1px solid var(--border);
            margin-top: 24px;
          }
        </style>
      </head>
      <body>
        <header>
          <div class="container">
            <div class="brand">
              <span class="badge">PNPtv! Digital Community</span>
              <span class="chip">Payment</span>
            </div>
          </div>
        </header>

        <main class="container">
          <section class="payment-section">
            <div class="payment-header">
              <div class="logo">🎥</div>
              <h1>Complete Payment</h1>
              <p class="subtitle">Secure crypto payment via Daimo Pay</p>
            </div>

            <div class="plan-info">
              <h2>${planName}</h2>
              <p>${planDescription}</p>
              <div class="price">$${amount} <span class="currency">USDC</span></div>
            </div>

            <div id="payment-info" style="text-align: center;">
              <div style="background: rgba(223,0,255,0.05); border: 1px solid rgba(223,0,255,0.2); padding: 20px; border-radius: 16px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: var(--accent); font-size: 16px;">Treasury Address</h3>
                <code id="wallet-address" style="background: var(--bg); padding: 12px 16px; border-radius: 10px; display: block; color: var(--text); font-size: 13px; word-break: break-all; cursor: pointer; border: 1px solid var(--border);">${process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0'}</code>
                <button onclick="copyAddress()" style="margin-top: 12px; padding: 10px 20px; background: rgba(223,0,255,0.15); border: 1px solid rgba(223,0,255,0.3); border-radius: 10px; color: var(--accent); cursor: pointer; font-weight: 600;">
                  📋 Copy Address
                </button>
              </div>

              <div style="margin: 24px 0;">
                <canvas id="qr-code" style="max-width: 280px; height: auto; border-radius: 16px; border: 4px solid var(--panel); background: white; padding: 16px;"></canvas>
              </div>

              <div style="background: rgba(106,64,167,0.1); border: 1px solid var(--border); padding: 16px; border-radius: 12px; margin-top: 20px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6;">
                  <strong>📱 How to Pay:</strong><br>
                  1. Open your USDC wallet (Base, Ethereum, or Polygon)<br>
                  2. Scan the QR code or copy the address above<br>
                  3. Send exactly <strong>$${amount} USDC</strong><br>
                  4. Your subscription activates automatically!
                </p>
              </div>
            </div>

            <div class="error" id="error" style="display:none;"></div>

            <div class="security-note">
              🔒 Secure payment powered by Daimo Pay<br>
              Your transaction is encrypted and secure
            </div>
          </section>
        </main>

        <footer class="container">
          <p>© 2025 PNPtv! Digital Community — <a href="mailto:support@pnptv.app">support@pnptv.app</a></p>
        </footer>

        <script>
          const planId = "${plan}";
          const userId = "${user}";
          const amount = parseFloat("${amount}");
          const apiBaseUrl = window.location.origin;
          const treasuryAddress = "${process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0'}";
          const reference = \`\${planId}_\${userId}_\${Date.now()}\`;

          // Generate QR code on page load
          window.addEventListener('load', () => {
            const canvas = document.getElementById('qr-code');

            // Create payment URI for wallets (EIP-681 format)
            const paymentUri = \`ethereum:\${treasuryAddress}@8453?value=\${amount * 1e6}\`;

            QRCode.toCanvas(canvas, paymentUri, {
              width: 280,
              margin: 2,
              color: {
                dark: '#28282B',
                light: '#FFFFFF'
              }
            }, function (error) {
              if (error) {
                console.error('QR Code generation error:', error);
                canvas.style.display = 'none';
              } else {
                console.log('QR Code generated successfully');
              }
            });

            // Notify backend payment started
            notifyPaymentStarted();

            // Poll for payment confirmation every 10 seconds
            setInterval(checkPaymentStatus, 10000);
          });

          // Copy address to clipboard
          function copyAddress() {
            const address = document.getElementById('wallet-address').textContent;
            navigator.clipboard.writeText(address).then(() => {
              const btn = event.target;
              const originalText = btn.textContent;
              btn.textContent = '✅ Copied!';
              btn.style.background = 'rgba(34, 197, 94, 0.15)';
              btn.style.borderColor = 'rgba(34, 197, 94, 0.3)';
              btn.style.color = '#22c55e';

              setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = 'rgba(223,0,255,0.15)';
                btn.style.borderColor = 'rgba(223,0,255,0.3)';
                btn.style.color = 'var(--accent)';
              }, 2000);
            }).catch(err => {
              console.error('Failed to copy:', err);
              alert('Failed to copy address. Please copy manually.');
            });
          }

          // Notify backend payment started
          async function notifyPaymentStarted() {
            try {
              await fetch(\`\${apiBaseUrl}/api/payments/started\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, planId, amount, reference })
              });
              console.log('Payment intent created');
            } catch (e) {
              console.warn('Failed to notify payment start:', e);
            }
          }

          // Check payment status (would need backend webhook integration)
          async function checkPaymentStatus() {
            try {
              const response = await fetch(\`\${apiBaseUrl}/api/payments/status?reference=\${reference}\`);
              const data = await response.json();

              if (data.status === 'completed') {
                window.location.href = \`\${apiBaseUrl}/payment/success?ref=\${reference}\`;
              }
            } catch (e) {
              console.warn('Failed to check payment status:', e);
            }
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error("Error serving payment page:", error);
    res.status(500).send("Internal server error");
  }
});

// Webhook endpoint for Telegram
app.post(`/bot${process.env.TELEGRAM_TOKEN}`, (req, res) => {
  bot.handleUpdate(req.body, res);
});

// ePayco payment response endpoint (user redirect after payment)
app.get("/epayco/response", async (req, res) => {
  try {
    const { ref_payco, x_transaction_state, x_id_invoice, x_approval_code } = req.query;

    logger.info("ePayco payment response (user redirect):", {
      reference: ref_payco,
      state: x_transaction_state,
      invoice: x_id_invoice,
    });

    // Show user-friendly success page
    if (x_transaction_state === "Aceptada") {
      res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Pago Exitoso</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 400px;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            p {
              color: #666;
              line-height: 1.6;
            }
            .button {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              transition: background 0.3s;
            }
            .button:hover {
              background: #764ba2;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✅</div>
            <h1>¡Pago Exitoso!</h1>
            <p>Tu suscripción se activará en breve. Recibirás una confirmación en el bot.</p>
            <p>Gracias por tu compra!</p>
            <a href="https://t.me/${bot.botInfo?.username || 'PNPtvbot'}" class="button">Volver al Bot</a>
          </div>
        </body>
        </html>
      `);
    } else if (x_transaction_state === "Rechazada") {
      res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Pago Rechazado</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 400px;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            p {
              color: #666;
              line-height: 1.6;
            }
            .button {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 30px;
              background: #f5576c;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              transition: background 0.3s;
            }
            .button:hover {
              background: #f093fb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">❌</div>
            <h1>Pago Rechazado</h1>
            <p>Tu pago no pudo ser procesado. Por favor intenta nuevamente o contacta a soporte.</p>
            <a href="https://t.me/${bot.botInfo?.username || 'PNPtvbot'}" class="button">Volver al Bot</a>
          </div>
        </body>
        </html>
      `);
    } else {
      res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Procesando Pago</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 400px;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            p {
              color: #666;
              line-height: 1.6;
            }
            .button {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 30px;
              background: #fcb69f;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              transition: background 0.3s;
            }
            .button:hover {
              background: #ffecd2;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">⏳</div>
            <h1>Procesando Pago</h1>
            <p>Tu pago está siendo procesado. Recibirás una confirmación en el bot pronto.</p>
            <p>Estado: ${x_transaction_state}</p>
            <a href="https://t.me/${bot.botInfo?.username || 'PNPtvbot'}" class="button">Volver al Bot</a>
          </div>
        </body>
        </html>
      `);
    }
  } catch (error) {
    logger.error("Error processing ePayco response:", error);
    res.status(500).send("Error processing payment response");
  }
});

// ePayco confirmation webhook (server-to-server)
app.post("/epayco/confirmation", async (req, res) => {
  try {
    const webhookData = req.body;

    logger.info("ePayco confirmation webhook received:", {
      reference: webhookData.x_ref_payco,
      state: webhookData.x_transaction_state,
      invoice: webhookData.x_id_invoice,
      amount: webhookData.x_amount,
      currency: webhookData.x_currency_code,
    });

    // Verify webhook signature
    const crypto = require("crypto");
    const {
      x_cust_id_cliente,
      x_ref_payco,
      x_transaction_id,
      x_amount,
      x_currency_code,
      x_signature,
    } = webhookData;

    // ePayco signature format: x_cust_id_cliente^x_ref_payco^x_transaction_id^x_amount^x_currency_code
    const signatureString = `${x_cust_id_cliente}^${process.env.EPAYCO_P_KEY}^${x_ref_payco}^${x_transaction_id}^${x_amount}^${x_currency_code}`;
    const expectedSignature = crypto
      .createHash("sha256")
      .update(signatureString)
      .digest("hex");

    // Verify signature (strict mode can be disabled for testing)
    const strictMode = process.env.EPAYCO_ALLOW_UNSIGNED_WEBHOOKS !== "true";
    if (strictMode && x_signature !== expectedSignature) {
      logger.warn("ePayco webhook signature verification failed:", {
        received: x_signature,
        expected: expectedSignature,
      });
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Extract metadata from invoice ID (format: plan_userId_timestamp)
    const invoice = webhookData.x_id_invoice;
    const invoiceParts = invoice.split("_");
    const planId = invoiceParts[0];
    const userId = invoiceParts[1];

    logger.info("Processing ePayco payment confirmation:", {
      planId,
      userId,
      amount: webhookData.x_amount,
      state: webhookData.x_transaction_state,
    });

    // Only process successful payments
    if (
      webhookData.x_transaction_state === "Aceptada" &&
      (webhookData.x_cod_response === 1 || webhookData.x_cod_response === "1")
    ) {
      try {
        // Get plan details
        const planService = require("../services/planService");
        const plan = await planService.getPlanById(planId);

        if (!plan) {
          logger.error("Plan not found for ePayco payment:", { planId, userId });
          return res.status(404).json({ error: "Plan not found" });
        }

        // Get user from database
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          logger.error("User not found for ePayco payment:", { userId, planId });
          return res.status(404).json({ error: "User not found" });
        }

        // Use membership manager to activate subscription and generate invite link
        const { activateMembership } = require("../utils/membershipManager");
        const durationDays = plan.duration || plan.durationDays || 30;
        const result = await activateMembership(userId, plan.tier, "epayco_webhook", durationDays, bot);

        // Store additional payment metadata
        const now = new Date();
        await userRef.update({
          membershipPlanId: plan.id,
          membershipPlanName: plan.displayName || plan.name,
          paymentMethod: "epayco",
          paymentReference: webhookData.x_ref_payco,
          paymentTransactionId: webhookData.x_transaction_id,
          paymentAmount: parseFloat(webhookData.x_amount),
          paymentCurrency: webhookData.x_currency_code,
          paymentDate: now,
          updatedAt: now,
        });

        logger.info("Subscription activated via ePayco webhook:", {
          userId,
          planId,
          tier: plan.tier,
          expiresAt: result.expiresAt?.toISOString(),
          amount: webhookData.x_amount,
          reference: webhookData.x_ref_payco,
          inviteLink: result.inviteLink ? "generated" : "none",
        });

        // Send confirmation message to user via Telegram
        try {
          const userData = userDoc.data();
          const userName = userData.username || userData.firstName || "Usuario";

          let message = `✅ *¡Pago Confirmado!*\n\n` +
            `Hola ${userName}! Tu suscripción *${plan.displayName || plan.name}* ha sido activada exitosamente.\n\n` +
            `📋 *Detalles:*\n` +
            `• Plan: ${plan.displayName || plan.name}\n` +
            `• Duración: ${durationDays} días\n` +
            `• Expira: ${result.expiresAt.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}\n` +
            `• Monto: $${parseFloat(webhookData.x_amount).toLocaleString('es-CO')} ${webhookData.x_currency_code}\n` +
            `• Referencia: ${webhookData.x_ref_payco}\n\n` +
            `¡Disfruta de tus beneficios premium! 💎`;

          // Add invite link if available
          if (result.inviteLink) {
            message += `\n\n🔗 *Únete al canal:*\n${result.inviteLink}`;
          }

          await bot.telegram.sendMessage(userId, message, { parse_mode: "Markdown" });
        } catch (msgError) {
          logger.warn("Failed to send ePayco confirmation message to user:", {
            userId,
            error: msgError.message,
          });
        }

        // Respond to ePayco
        return res.status(200).send("OK");
      } catch (activationError) {
        logger.error("Error activating subscription from ePayco webhook:", activationError);
        return res.status(500).json({ error: "Failed to activate subscription" });
      }
    } else if (webhookData.x_transaction_state === "Rechazada") {
      // Payment was rejected
      logger.warn("ePayco payment rejected:", {
        userId,
        planId,
        reason: webhookData.x_response_reason_text,
      });

      try {
        await bot.telegram.sendMessage(
          userId,
          `❌ *Pago Rechazado*\n\n` +
          `Tu pago no pudo ser procesado.\n\n` +
          `Razón: ${webhookData.x_response_reason_text || "No especificada"}\n` +
          `Referencia: ${webhookData.x_ref_payco}\n\n` +
          `Por favor intenta nuevamente o contacta a soporte.`,
          { parse_mode: "Markdown" }
        );
      } catch (msgError) {
        logger.warn("Failed to send rejection message:", msgError);
      }

      return res.status(200).send("OK");
    } else {
      // Other states (Pendiente, etc.)
      logger.info("ePayco payment in non-final state:", {
        state: webhookData.x_transaction_state,
        userId,
        planId,
      });
      return res.status(200).send("OK");
    }
  } catch (error) {
    logger.error("Error processing ePayco confirmation webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Daimo Pay webhook endpoint (official webhook from Daimo dashboard)
app.post("/daimo/webhook", async (req, res) => {
  try {
    logger.info("Received Daimo Pay webhook", {
      event: req.body.type,
      reference: req.body.reference,
    });

    // Verify webhook authentication
    const authHeader = req.headers.authorization;
    const isValidAuth = daimo.verifyWebhookAuth(authHeader);

    if (!isValidAuth) {
      logger.warn('Invalid Daimo webhook authentication', {
        received: authHeader ? 'present' : 'missing',
      });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const event = req.body;

    // Handle payment_completed event
    if (event.type === 'payment_completed') {
      const { reference, metadata, amount } = event;
      const userId = metadata?.userId;
      const planId = metadata?.plan;

      logger.info('Daimo payment completed', {
        userId,
        planId,
        amount,
        reference,
      });

      if (userId && planId) {
        try {
          // Update payment intent in database
          await db.collection('payment_intents').doc(reference).update({
            status: 'completed_webhook',
            webhookReceivedAt: Date.now(),
          });

          // Get plan details
          const planService = require('../services/planService');
          const plan = await planService.getPlanById(planId);

          if (!plan) {
            logger.error('Plan not found for payment', { planId, userId });
            return res.status(404).json({ error: 'Plan not found' });
          }

          // Check if user exists
          const userRef = db.collection('users').doc(userId);
          const userDoc = await userRef.get();

          if (!userDoc.exists) {
            logger.error('User not found for payment', { userId, planId });
            return res.status(404).json({ error: 'User not found' });
          }

          // Use membership manager to activate subscription and generate invite link
          const { activateMembership } = require('../utils/membershipManager');
          const durationDays = plan.duration || plan.durationDays || 30;
          const result = await activateMembership(userId, plan.tier, 'daimo_webhook', durationDays, bot);

          // Store additional payment metadata
          await userRef.update({
            membershipPlanId: plan.id,
            membershipPlanName: plan.displayName || plan.name,
            paymentMethod: 'daimo',
            paymentReference: reference,
            updatedAt: new Date(),
          });

          logger.info('Subscription activated via Daimo webhook', {
            userId,
            planId,
            tier: plan.tier,
            expiresAt: result.expiresAt?.toISOString(),
            inviteLink: result.inviteLink ? 'generated' : 'none',
          });

          // Notify user in Telegram
          try {
            let message = `✅ Payment confirmed!\n\n` +
              `Your ${plan.displayName || plan.name} subscription is now active.\n` +
              `Duration: ${durationDays} days\n` +
              `Expires: ${result.expiresAt.toLocaleDateString()}\n\n` +
              `Enjoy your premium features! 💎`;

            // Add invite link if available
            if (result.inviteLink) {
              message += `\n\n🔗 Join the channel:\n${result.inviteLink}`;
            }

            await bot.telegram.sendMessage(userId, message);
          } catch (notifyError) {
            logger.warn('Failed to notify user', { userId, error: notifyError.message });
          }
        } catch (activationError) {
          logger.error('Error activating subscription', activationError);
          return res.status(500).json({ error: 'Failed to activate subscription' });
        }
      }
    }

    // Handle other event types
    else if (event.type === 'payment_started') {
      logger.info('Payment started webhook received', event);
    } else if (event.type === 'payment_bounced') {
      logger.warn('Payment bounced', event);
    } else if (event.type === 'payment_refunded') {
      logger.info('Payment refunded', event);
    } else {
      logger.info('Unknown Daimo webhook event type', { type: event.type });
    }

    // All events have been processed
    return res.json({ success: true, message: "Webhook received" });
  } catch (error) {
    logger.error("Error processing Daimo webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Daimo payment success redirect
app.get("/payment/success", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Successful</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          text-align: center;
          max-width: 400px;
        }
        .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
        }
        p {
          color: #666;
          line-height: 1.6;
        }
        .button {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 30px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          transition: background 0.3s;
        }
        .button:hover {
          background: #764ba2;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">✅</div>
        <h1>Payment Successful!</h1>
        <p>Your subscription has been activated. You'll receive a confirmation in the bot shortly.</p>
        <p>Thank you for using Daimo Pay!</p>
        <a href="https://t.me/${bot.botInfo?.username || 'PNPtvbot'}" class="button">Return to Bot</a>
      </div>
    </body>
    </html>
  `);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error("Express error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Set webhook with Railway URL detection
async function setupWebhook() {
  // Railway provides RAILWAY_PUBLIC_DOMAIN or construct from service
  const webhookUrl =
    process.env.WEBHOOK_URL ||
    process.env.BOT_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "https://yourdomain.com");

  const path = `/bot${process.env.TELEGRAM_TOKEN}`;

  try {
    await bot.telegram.setWebhook(`${webhookUrl}${path}`);
    logger.info(`Webhook configured: ${webhookUrl}${path}`);
    console.log(`✅ Webhook set to: ${webhookUrl}${path}`);
  } catch (error) {
    logger.error("Failed to set webhook:", error);
    throw error;
  }
}

// Graceful shutdown handler
function setupGracefulShutdown(server) {
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    console.log(`\n${signal} received, shutting down gracefully...`);

    // Stop accepting new requests
    server.close(() => {
      logger.info("HTTP server closed");
      console.log("HTTP server closed");
    });

    // Stop the bot
    try {
      await bot.stop(signal);
      logger.info("Bot stopped");
      console.log("Bot stopped");
    } catch (error) {
      logger.error("Error stopping bot:", error);
    }

    // Give active requests time to finish
    setTimeout(() => {
      logger.info("Forcing shutdown");
      process.exit(0);
    }, 10000); // 10 second grace period
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

// Start server
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0"; // Required for Railway

if (require.main === module) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // In development mode, start Express server without webhook (use polling mode from bot)
  if (isDevelopment) {
    logger.info("Starting in development mode (polling) - webhook disabled");
    console.log("\n⚙️  Development Mode: Starting server without webhook");
    console.log("   Bot will use polling mode from index.js");
    console.log("   Express server available for payment endpoints\n");

    // Start Express server only (bot runs separately via index.js in polling mode)
    const server = app.listen(PORT, HOST, () => {
      logger.info(`Development server running on ${HOST}:${PORT}`);
      console.log(`\n🚀 PNPtv Development Server Started`);
      console.log(`   - Environment: development`);
      console.log(`   - Host: ${HOST}`);
      console.log(`   - Port: ${PORT}`);
      console.log(`   - Health Check: http://localhost:${PORT}/health`);
      console.log(`   - Payment Page: http://localhost:${PORT}/pay`);
      console.log(`   - Run 'npm start' in another terminal for bot polling mode\n`);
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);
  } else {
    // Production mode: use webhook
    setupWebhook()
      .then(() => {
        const server = app.listen(PORT, HOST, () => {
          logger.info(`Webhook server running on ${HOST}:${PORT}`);
          console.log(`\n🚀 PNPtv Bot Server Started`);
          console.log(`   - Environment: ${process.env.NODE_ENV || "production"}`);
          console.log(`   - Host: ${HOST}`);
          console.log(`   - Port: ${PORT}`);
          console.log(`   - Health Check: http://localhost:${PORT}/health`);
          console.log(`   - Bot Username: @${bot.botInfo?.username || "PNPtvbot"}\n`);
        });

        // Setup graceful shutdown
        setupGracefulShutdown(server);
      })
      .catch((error) => {
        logger.error("Failed to start webhook server:", error);
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
      });
  }
}

module.exports = { app, setupWebhook };
