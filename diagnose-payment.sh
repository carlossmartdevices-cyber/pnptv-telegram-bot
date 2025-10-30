#!/bin/bash

echo "=========================================="
echo "PNPtv Payment Diagnostic Tool"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if bot is running
echo -e "${YELLOW}1. Checking if bot is running...${NC}"
if pm2 list | grep -q "pnptv-bot.*online"; then
    echo -e "${GREEN}✓ Bot is running${NC}"
else
    echo -e "${RED}✗ Bot is NOT running${NC}"
    echo "  Start with: pm2 start ecosystem.config.js"
fi
echo ""

# Check if payment page exists
echo -e "${YELLOW}2. Checking payment page file...${NC}"
if [ -f "public/payment-daimo.html" ]; then
    echo -e "${GREEN}✓ Payment page exists${NC}"
    # Check if it's the new version
    if grep -q "loadPlanDetails" public/payment-daimo.html; then
        echo -e "${GREEN}✓ Using NEW payment page (with dynamic data)${NC}"
    else
        echo -e "${YELLOW}⚠ Using OLD payment page (hardcoded data)${NC}"
    fi
else
    echo -e "${RED}✗ Payment page NOT found${NC}"
fi
echo ""

# Check API routes
echo -e "${YELLOW}3. Checking API routes file...${NC}"
if [ -f "src/bot/api/routes.js" ]; then
    echo -e "${GREEN}✓ API routes file exists${NC}"
    if grep -q "durationDays" src/bot/api/routes.js; then
        echo -e "${GREEN}✓ API returns durationDays field${NC}"
    else
        echo -e "${YELLOW}⚠ API may not return durationDays${NC}"
    fi
else
    echo -e "${RED}✗ API routes file NOT found${NC}"
fi
echo ""

# Test API endpoint (if bot is running)
echo -e "${YELLOW}4. Testing API endpoints...${NC}"
if command -v curl &> /dev/null; then
    # Try localhost first
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null)
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ Bot is responding on localhost:3000${NC}"

        # Test plan API
        echo "  Testing /api/plans/trial-pass..."
        plan_response=$(curl -s http://localhost:3000/api/plans/trial-pass 2>/dev/null)
        if echo "$plan_response" | grep -q "error"; then
            echo -e "${RED}  ✗ Plan not found or error${NC}"
            echo "  Response: $plan_response"
        elif echo "$plan_response" | grep -q "name"; then
            echo -e "${GREEN}  ✓ Plan API working${NC}"
            echo "$plan_response" | jq '.' 2>/dev/null || echo "$plan_response"
        else
            echo -e "${YELLOW}  ? Unexpected response${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Bot not responding (may not be started)${NC}"
    fi
else
    echo "  curl not available, skipping API test"
fi
echo ""

# Check environment variables
echo -e "${YELLOW}5. Checking environment configuration...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"

    # Check critical variables
    if grep -q "FIREBASE_PROJECT_ID" .env; then
        echo -e "${GREEN}  ✓ Firebase configured${NC}"
    else
        echo -e "${RED}  ✗ Firebase not configured${NC}"
    fi

    if grep -q "DAIMO_APP_ID" .env; then
        echo -e "${GREEN}  ✓ Daimo configured${NC}"
    else
        echo -e "${RED}  ✗ Daimo not configured${NC}"
    fi

    if grep -q "BOT_URL" .env; then
        BOT_URL=$(grep "BOT_URL" .env | cut -d'=' -f2)
        echo -e "${GREEN}  ✓ BOT_URL set to: $BOT_URL${NC}"
    else
        echo -e "${RED}  ✗ BOT_URL not set${NC}"
    fi
else
    echo -e "${RED}✗ .env file NOT found${NC}"
fi
echo ""

# Check logs
echo -e "${YELLOW}6. Recent error logs...${NC}"
if pm2 list | grep -q "pnptv-bot"; then
    echo "Last 10 error lines:"
    pm2 logs pnptv-bot --err --lines 10 --nostream 2>/dev/null || echo "  No error logs or pm2 not configured"
else
    echo "  Bot not running in PM2"
fi
echo ""

# Summary
echo "=========================================="
echo -e "${YELLOW}Diagnostic Summary${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. If bot not running: pm2 start ecosystem.config.js"
echo "2. If using old payment page: Deploy the fix"
echo "3. If API not working: Check Firebase connection"
echo "4. View full logs: pm2 logs pnptv-bot"
echo ""
echo "For testing payment page:"
echo "  Open: http://localhost:3000/pay?plan=PLAN_ID&user=123&amount=5"
echo "  (Replace PLAN_ID with actual plan ID from database)"
echo ""
