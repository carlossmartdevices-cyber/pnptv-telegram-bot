class SubscriptionError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = "SubscriptionError";
    this.code = code;
    this.details = details;
  }
}

class PaymentGatewayError extends SubscriptionError {
  constructor(message, details = {}) {
    super(message, "PAYMENT_GATEWAY_ERROR", details);
  }
}

class PlanNotFoundError extends SubscriptionError {
  constructor(identifier) {
    super(`Plan not found: ${identifier}`, "PLAN_NOT_FOUND", { identifier });
  }
}

module.exports = {
  SubscriptionError,
  PaymentGatewayError,
  PlanNotFoundError,
};
