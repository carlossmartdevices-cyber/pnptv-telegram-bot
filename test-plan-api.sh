#!/bin/bash

echo "Testing Plan API endpoints..."
echo ""

# Test some common plan IDs
PLAN_IDS=("trial-pass" "monthly" "quarterly" "annual" "basic" "premium" "trial_pass" "1-month" "3-months" "12-months")

for plan_id in "${PLAN_IDS[@]}"; do
  echo "Testing: /api/plans/$plan_id"
  curl -s "http://localhost:3000/api/plans/$plan_id" | jq '.' 2>/dev/null || echo "Not found or server not running"
  echo ""
done
