#!/usr/bin/env bash
set -euo pipefail

# Script: add_vercel_envs.sh
# Purpose: Run interactive `vercel env add <NAME> production` for each required env var.
# Usage: cd /root/Bots/pnptv-payment && bash add_vercel_envs.sh
# You will be prompted to paste each secret value.

VARS=(
  # Core Firebase + webhook
  "FIREBASE_PROJECT_ID"
  "FIREBASE_CLIENT_EMAIL"
  "FIREBASE_PRIVATE_KEY"
  "FIREBASE_DATABASE_URL"
  "WEBHOOK_SECRET"

  # Daimo / Payment (frontend + server)
  "NEXT_PUBLIC_RECIPIENT_ADDRESS"
  "NEXT_PUBLIC_TREASURY_ADDRESS"
  "NEXT_PUBLIC_REFUND_ADDRESS"
  "NEXT_PUBLIC_DAIMO_APP_ID"
  "NEXT_PUBLIC_DAIMO_ENV"
  "NEXT_PUBLIC_DAIMO_CURRENCY"
  "DAIMO_APP_ID"
  "DAIMO_WEBHOOK_TOKEN"
  "DAIMO_WEBHOOK_URL"
  "DAIMO_RETURN_URL"
  "DAIMO_WEBHOOK_VALIDATION"
  "DAIMO_API_URL"
  "DAIMO_API_VERSION"
  "DAIMO_API_TIMEOUT"
  "DAIMO_MIN_AMOUNT"
  "DAIMO_MAX_AMOUNT"
  "NEXT_PUBLIC_SETTLEMENT_CHAIN"
  "NEXT_PUBLIC_SETTLEMENT_TOKEN"

  # Monitoring / optional
  "SENTRY_DSN"
  "NEXT_PUBLIC_SENTRY_DSN"

  # Optional: set NODE_ENV (Vercel sets this automatically, optional to add)
  # "NODE_ENV"
)

echo "This script will run 'vercel env add <NAME> production' for each variable below."
echo "It will prompt you to paste the value for each variable interactively. Press Ctrl+C to abort."

echo
for name in "${VARS[@]}"; do
  echo "================================================================"
  echo "Adding env var: $name"
  echo "When prompted, paste the value for $name and press Enter. For multiline values (like FIREBASE_PRIVATE_KEY), paste the full key including newlines."
  echo "If you prefer to add via dashboard instead, press Ctrl+C now."
  echo "----------------------------------------------------------------"
  vercel env add "$name" production
done

echo "\nAll env var prompts finished. Verify with: vercel env ls"

echo "When done, redeploy with: vercel --prod"
