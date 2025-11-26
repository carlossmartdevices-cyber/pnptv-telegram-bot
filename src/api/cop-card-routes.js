const express = require('express');
const router = express.Router();
const copCardService = require('../services/copCardService');
const { activateMembership } = require('../utils/membershipManager');
const logger = require('../utils/logger');
const { escapeHtml, escapeMdV2 } = require('../utils/telegramEscapes');

/**
 * COP Card Payment Webhook Routes
 * Handles admin verification and payment confirmation pages
 */

/**
 * GET /cop-card/payment/:reference
 * Display payment verification page for admin
 */
router.get('/payment/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    // Get payment details
    const payment = await copCardService.getPaymentByReference(reference);

    if (!payment) {
      return res.status(404).send(`
  <!DOCTYPE html>
  <html>
  <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Not Found - PNPtv</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #e74c3c; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Payment Not Found</h1>
            <p>The payment reference <code>${escapeHtml(String(reference))}</code> was not found in our system.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Status badge styling
    const statusColors = {
      'pending_payment': '#f39c12',
      'awaiting_verification': '#3498db',
      'verified': '#27ae60',
      'completed': '#2ecc71'
    };

    const statusLabels = {
      'pending_payment': '⏳ Pending Payment',
      'awaiting_verification': '🔍 Awaiting Verification',
      'verified': '✅ Verified',
      'completed': '🎉 Completed'
    };

    const statusColor = statusColors[payment.status] || '#95a5a6';
    const statusLabel = statusLabels[payment.status] || payment.status;

    // Disable verify button if already verified/completed
    const canVerify = payment.status === 'awaiting_verification' || payment.status === 'pending_payment';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Verification - ${escapeHtml(String(reference))}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header p { opacity: 0.9; font-size: 14px; }
          .content { padding: 30px; }
          .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            color: white;
            background: ${statusColor};
            margin-bottom: 20px;
          }
          .info-grid {
            display: grid;
            gap: 15px;
            margin: 20px 0;
          }
          .info-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
          }
          .info-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }
          .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            word-break: break-all;
          }
          .reference-code {
            background: #667eea;
            color: white;
            padding: 3px 8px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
          }
          .button-group {
            margin-top: 30px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          .btn {
            flex: 1;
            min-width: 200px;
            padding: 15px 30px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            text-align: center;
            display: inline-block;
          }
          .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4); }
          .btn-primary:disabled {
            background: #95a5a6;
            cursor: not-allowed;
            transform: none;
          }
          .btn-secondary {
            background: white;
            color: #667eea;
            border: 2px solid #667eea;
          }
          .btn-secondary:hover { background: #f8f9fa; }
          .alert {
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
          .alert-info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
          .alert-warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
          #loading {
            display: none;
            text-align: center;
            padding: 20px;
          }
          .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .timestamp {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Payment Verification</h1>
            <p>PNPtv Admin Panel</p>
          </div>

          <div class="content">
            <div class="status-badge">${escapeHtml(String(statusLabel))}</div>

            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Reference Number</div>
                <div class="info-value"><span class="reference-code">${escapeHtml(String(payment.reference))}</span></div>
              </div>

              <div class="info-item">
                <div class="info-label">User ID</div>
                <div class="info-value">${escapeHtml(String(payment.userId))}</div>
              </div>

              <div class="info-item">
                <div class="info-label">Plan</div>
                <div class="info-value">💎 ${escapeHtml(String(payment.planName))}</div>
              </div>

              <div class="info-item">
                <div class="info-label">Amount</div>
                <div class="info-value">$${escapeHtml(String(payment.amount.toLocaleString('es-CO')))} COP</div>
              </div>

              <div class="info-item">
                <div class="info-label">Duration</div>
                <div class="info-value">${escapeHtml(String(payment.durationDays))} days</div>
              </div>

              <div class="info-item">
                <div class="info-label">Membership Tier</div>
                <div class="info-value">${escapeHtml(String(payment.tier))}</div>
              </div>

              <div class="info-item">
                <div class="info-label">Created At</div>
                <div class="info-value">
                  ${escapeHtml(String(new Date(payment.createdAt).toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })))}
                </div>
              </div>

              ${payment.userConfirmedAt ? `
              <div class="info-item">
                <div class="info-label">User Confirmed At</div>
                <div class="info-value">
                  ${escapeHtml(String(new Date(payment.userConfirmedAt).toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })))}
                </div>
              </div>
              ` : ''}

              ${payment.verifiedAt ? `
              <div class="info-item">
                <div class="info-label">Verified At</div>
                <div class="info-value">
                  ${escapeHtml(String(new Date(payment.verifiedAt).toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })))}
                  <div class="timestamp">By admin: ${escapeHtml(String(payment.verifiedBy || 'Unknown'))}</div>
                </div>
              </div>
              ` : ''}
            </div>

            ${payment.status === 'awaiting_verification' ? `
              <div class="alert alert-warning">
                ⚠️ This payment is awaiting verification. Please check your payment gateway to confirm the transaction was received.
              </div>
            ` : ''}

            ${payment.status === 'verified' || payment.status === 'completed' ? `
              <div class="alert alert-success">
                ✅ This payment has been verified and the membership has been activated.
              </div>
            ` : ''}

            <div id="loading" style="display: none;">
              <div class="spinner"></div>
              <p style="margin-top: 15px; color: #666;">Processing...</p>
            </div>

            <div class="button-group" id="actionButtons">
              <button
                class="btn btn-primary"
                id="verifyBtn"
                onclick="verifyPayment()"
                ${!canVerify ? 'disabled' : ''}
              >
                ✅ Verify & Activate Membership
              </button>

              <a href="/cop-card/payment/${escapeHtml(String(reference))}" class="btn btn-secondary">
                🔄 Refresh
              </a>
            </div>
          </div>
        </div>

        <script>
          async function verifyPayment() {
            if (!confirm('Are you sure you want to verify this payment and activate the membership?')) {
              return;
            }

            const btn = document.getElementById('verifyBtn');
            const loading = document.getElementById('loading');
            const actionButtons = document.getElementById('actionButtons');

            btn.disabled = true;
            loading.style.display = 'block';
            actionButtons.style.display = 'none';

            try {
              const response = await fetch('/cop-card/verify/${escapeHtml(String(reference))}', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                }
              });

              const data = await response.json();

              if (data.success) {
                alert('✅ Payment verified successfully! Membership activated.');
                window.location.reload();
              } else {
                alert('❌ Error: ' + (data.message || 'Failed to verify payment'));
                loading.style.display = 'none';
                actionButtons.style.display = 'flex';
                btn.disabled = false;
              }
            } catch (error) {
              alert('❌ Error verifying payment: ' + error.message);
              loading.style.display = 'none';
              actionButtons.style.display = 'flex';
              btn.disabled = false;
            }
          }
        </script>
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    logger.error('Error displaying payment verification page:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * POST /cop-card/verify/:reference
 * Verify payment and activate membership
 */
router.post('/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    // Get payment details
    const payment = await copCardService.getPaymentByReference(reference);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if already completed
    if (payment.status === 'completed') {
      return res.json({
        success: true,
        message: 'Payment already verified and membership activated'
      });
    }

    // Verify payment
    await copCardService.verifyPayment(payment.paymentId, 'admin_webhook');

    // Get bot instance
    const bot = require('../bot/index');

    // Activate membership
    const result = await activateMembership(
      payment.userId,
      payment.tier,
      'cop_card_verified',
      payment.durationDays,
      bot,
      {
        paymentAmount: payment.amount,
        paymentCurrency: 'COP',
        paymentMethod: 'Credit/Debit Card',
        reference: payment.reference
      }
    );

    // Mark as completed
    await copCardService.markAsCompleted(payment.paymentId);

    // Send success notification to user
      try {
      await bot.telegram.sendMessage(
        payment.userId,
        `🎉 *¡Membresía Activada!*\n\n` +
        `Tu pago de $${escapeMdV2(payment.amount.toLocaleString('es-CO'))} COP ha sido verificado.\n\n` +
        `💎 Plan: ${escapeMdV2(payment.planName)}\n` +
        `⏱️ Duración: ${escapeMdV2(String(payment.durationDays))} días\n` +
        `🔖 Referencia: \`${escapeMdV2(payment.reference)}\`\n\n` +
        `✅ Tu membresía está activa. ¡Disfruta del contenido premium!`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (notifyError) {
      logger.warn('Failed to send activation notification to user:', notifyError);
    }

    logger.info(`Payment ${payment.paymentId} verified and membership activated for user ${payment.userId}`);

    res.json({
      success: true,
      message: 'Payment verified and membership activated successfully',
      payment: {
        reference: payment.reference,
        userId: payment.userId,
        planName: payment.planName,
        amount: payment.amount,
        tier: payment.tier
      }
    });
  } catch (error) {
    logger.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment: ' + error.message
    });
  }
});

/**
 * GET /cop-card/status/:reference
 * Get payment status (JSON API)
 */
router.get('/status/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    const payment = await copCardService.getPaymentByReference(reference);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      payment: {
        reference: payment.reference,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        planName: payment.planName,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error getting payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status'
    });
  }
});

/**
 * GET /cop-card/instructions
 * Static payment instructions page (fallback if no custom link)
 */
router.get('/instructions', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Instructions - PNPtv</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 { color: #667eea; margin-bottom: 10px; }
        .alert {
          padding: 15px;
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          margin: 20px 0;
        }
        .steps {
          list-style: none;
          padding: 0;
          counter-reset: step-counter;
        }
        .steps li {
          counter-increment: step-counter;
          margin: 15px 0;
          padding-left: 40px;
          position: relative;
        }
        .steps li::before {
          content: counter(step-counter);
          position: absolute;
          left: 0;
          top: 0;
          background: #667eea;
          color: white;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          text-align: center;
          line-height: 25px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>💳 Payment Instructions</h1>
        <p>Thank you for choosing PNPtv Premium!</p>

        <div class="alert">
          ⚠️ <strong>Note:</strong> The payment gateway link will be configured by the administrator.
          Please contact support for payment details.
        </div>

        <h2>How to complete your payment:</h2>
        <ol class="steps">
          <li>Return to the Telegram bot</li>
          <li>Copy your unique payment reference</li>
          <li>Contact support to get payment instructions</li>
          <li>Complete the payment including the reference</li>
          <li>Confirm payment in the bot</li>
        </ol>

        <p><strong>Support Contact:</strong> @PNPtvbot</p>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

/**
 * GET /cop-card/thank-you
 * Thank you page shown after completing Wompi payment
 * This page provides instructions on how to activate membership in the bot
 */
router.get('/thank-you', async (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>¡Gracias por tu pago! - PNPtv</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .container {
          background: white;
          max-width: 600px;
          width: 100%;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }

        .checkmark {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 50px;
          animation: scaleIn 0.5s ease-out 0.2s backwards;
        }

        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }

        .header h1 {
          font-size: 28px;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .header p {
          font-size: 16px;
          opacity: 0.9;
        }

        .content {
          padding: 40px 30px;
        }

        .instructions {
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }

        .instructions h2 {
          color: #667eea;
          font-size: 20px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .step {
          background: white;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 12px;
          border: 1px solid #e9ecef;
          display: flex;
          gap: 15px;
          align-items: start;
        }

        .step-number {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
        }

        .step-content {
          flex: 1;
        }

        .step-content strong {
          color: #2d3748;
          display: block;
          margin-bottom: 5px;
        }

        .step-content p {
          color: #4a5568;
          font-size: 14px;
          line-height: 1.6;
        }

        .bot-link {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          padding: 15px 30px;
          border-radius: 30px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .bot-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }

        .important-note {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          border-radius: 8px;
          margin-top: 20px;
        }

        .important-note strong {
          color: #856404;
          display: block;
          margin-bottom: 8px;
          font-size: 16px;
        }

        .important-note p {
          color: #856404;
          font-size: 14px;
          line-height: 1.6;
        }

        .footer {
          background: #f8f9fa;
          padding: 20px 30px;
          text-align: center;
          border-top: 1px solid #e9ecef;
        }

        .footer p {
          color: #6c757d;
          font-size: 14px;
          margin-bottom: 10px;
        }

        .support-link {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }

        .support-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 600px) {
          .container {
            border-radius: 10px;
          }

          .header {
            padding: 30px 20px;
          }

          .header h1 {
            font-size: 24px;
          }

          .content {
            padding: 30px 20px;
          }

          .step {
            flex-direction: column;
            gap: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="checkmark">✓</div>
          <h1>¡Pago Exitoso! / Payment Successful!</h1>
          <p>Gracias por tu compra en PNPtv / Thank you for your purchase at PNPtv</p>
        </div>

        <div class="content">
          <!-- Spanish Instructions -->
          <div class="instructions">
            <h2>🎯 Cómo Activar tu Membresía (Español)</h2>

            <div class="step">
              <div class="step-number">1</div>
              <div class="step-content">
                <strong>Abre el Bot de Telegram</strong>
                <p>Haz clic en el botón "Abrir Bot" abajo o busca <strong>@PNPtvbot</strong> en Telegram</p>
              </div>
            </div>

            <div class="step">
              <div class="step-number">2</div>
              <div class="step-content">
                <strong>Inicia Conversación</strong>
                <p>Presiona el botón "Start" o envía el comando <code>/start</code> al bot</p>
              </div>
            </div>

            <div class="step">
              <div class="step-number">3</div>
              <div class="step-content">
                <strong>Contacta Soporte</strong>
                <p>Envía un mensaje con tu número de referencia o usa el comando <code>/support</code> para que un administrador active tu membresía</p>
              </div>
            </div>

            <div class="step">
              <div class="step-number">4</div>
              <div class="step-content">
                <strong>¡Disfruta!</strong>
                <p>Una vez activada, recibirás acceso instantáneo al canal premium con todo el contenido exclusivo</p>
              </div>
            </div>
          </div>

          <!-- English Instructions -->
          <div class="instructions" style="margin-top: 30px;">
            <h2>🎯 How to Activate Your Membership (English)</h2>

            <div class="step">
              <div class="step-number">1</div>
              <div class="step-content">
                <strong>Open the Telegram Bot</strong>
                <p>Click the "Open Bot" button below or search for <strong>@PNPtvbot</strong> on Telegram</p>
              </div>
            </div>

            <div class="step">
              <div class="step-number">2</div>
              <div class="step-content">
                <strong>Start Conversation</strong>
                <p>Press the "Start" button or send the <code>/start</code> command to the bot</p>
              </div>
            </div>

            <div class="step">
              <div class="step-number">3</div>
              <div class="step-content">
                <strong>Contact Support</strong>
                <p>Send a message with your reference number or use the <code>/support</code> command so an administrator can activate your membership</p>
              </div>
            </div>

            <div class="step">
              <div class="step-number">4</div>
              <div class="step-content">
                <strong>Enjoy!</strong>
                <p>Once activated, you'll receive instant access to the premium channel with all exclusive content</p>
              </div>
            </div>
          </div>

          <a href="https://t.me/PNPtvbot" class="bot-link" target="_blank">
            <span>📱</span>
            <span>Abrir Bot de Telegram / Open Telegram Bot</span>
          </a>

          <div class="important-note">
            <strong>⚡ Importante / Important:</strong>
            <p><strong>ES:</strong> Tu pago ha sido recibido exitosamente. Un administrador verificará y activará tu membresía en las próximas horas. Recibirás una notificación en el bot cuando esté lista.</p>
            <p style="margin-top: 10px;"><strong>EN:</strong> Your payment has been received successfully. An administrator will verify and activate your membership within the next few hours. You'll receive a notification in the bot when it's ready.</p>
          </div>
        </div>

        <div class="footer">
          <p>¿Necesitas ayuda? / Need help?</p>
          <p>Contacta nuestro soporte / Contact our support: <a href="https://t.me/PNPtvbot" class="support-link" target="_blank">@PNPtvbot</a></p>
          <p style="margin-top: 15px; font-size: 12px;">© 2025 PNPtv - Todos los derechos reservados / All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

module.exports = router;
