const axios = require("axios");

const BOLD_API_KEY = process.env.BOLD_API_KEY;
const BOLD_API_BASE = process.env.BOLD_API_BASE || "https://integrations.api.bold.co";
const BOLD_CALLBACK_URL = process.env.BOLD_CALLBACK_URL;
const BOLD_REDIRECT_URL = process.env.BOLD_REDIRECT_URL;

if (!BOLD_API_KEY) {
  console.warn("[bold] BOLD_API_KEY is not configured. Bold API requests will fail.");
}

const http = axios.create({
  baseURL: BOLD_API_BASE,
  timeout: 10000,
});

if (BOLD_API_KEY) {
  http.defaults.headers.common["Authorization"] = `Bearer ${BOLD_API_KEY}`;
}

const sumAmounts = (items = []) =>
  items.reduce((total, item) => total + (Number(item?.amount) || 0), 0);

async function createPaymentLink({
  totalAmountCents,
  currency = "COP",
  description,
  referenceId,
  customerEmail,
  redirectUrl = BOLD_REDIRECT_URL,
  callbackUrl = BOLD_CALLBACK_URL,
  expirationDate,
  amountType = "CLOSE",
  tipAmountCents = 0,
  taxes = [],
  paymentMethods = [],
  metadata,
  imageUrl,
}) {
  if (!BOLD_API_KEY) {
    throw new Error("Bold API key is required to create payment links.");
  }

  if (amountType === "CLOSE" && typeof totalAmountCents !== "number") {
    throw new Error("totalAmountCents must be provided for CLOSE payment links.");
  }

  const normalizedTaxes = taxes.map((tax) => ({
    type: tax.type,
    base: tax.base,
    amount: tax.amount,
  }));

  const taxesTotal = sumAmounts(normalizedTaxes);
  const subtotal = typeof totalAmountCents === "number"
    ? Math.max(totalAmountCents - taxesTotal - (Number(tipAmountCents) || 0), 0)
    : undefined;

  const payload = {
    amount_type: amountType,
    currency,
    callback_url: callbackUrl,
    redirect_url: redirectUrl,
    description,
    payment_methods: paymentMethods,
    payer_email: customerEmail,
    reference: referenceId,
    metadata,
    image_url: imageUrl,
    expiration_date: expirationDate,
  };

  if (typeof totalAmountCents === "number") {
    payload.amount = {
      total: totalAmountCents,
      subtotal,
      tip_amount: tipAmountCents || 0,
      taxes: normalizedTaxes,
    };
    payload.total_amount = totalAmountCents;
  }

  try {
    const response = await http.post(
      "/online/link/v1/payment_link",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    const details = error.response ? error.response.data : error.message;
    console.error("[bold] Failed to create payment link:", details);
    throw error;
  }
}

async function getPaymentLink(paymentLinkId) {
  if (!BOLD_API_KEY) {
    throw new Error("Bold API key is required to consult payment links.");
  }

  if (!paymentLinkId) {
    throw new Error("paymentLinkId is required.");
  }

  try {
    const response = await http.get(`/online/link/v1/${paymentLinkId}`);
    return response.data;
  } catch (error) {
    const details = error.response ? error.response.data : error.message;
    console.error(`[bold] Failed to fetch payment link ${paymentLinkId}:`, details);
    throw error;
  }
}

async function getPaymentMethods() {
  if (!BOLD_API_KEY) {
    throw new Error("Bold API key is required to fetch payment methods.");
  }

  try {
    const response = await http.get("/online/link/v1/payment_methods");
    return response.data;
  } catch (error) {
    const details = error.response ? error.response.data : error.message;
    console.error("[bold] Failed to fetch payment methods:", details);
    throw error;
  }
}

module.exports = {
  createPaymentLink,
  getPaymentLink,
  getPaymentMethods,
};
