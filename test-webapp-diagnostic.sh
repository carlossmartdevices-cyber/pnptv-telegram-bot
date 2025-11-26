#!/bin/bash
# WebApp Diagnostic Test Script
# Tests the diagnostic endpoints to verify webapp setup

echo "=== PNPtv WebApp Diagnostic Test ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test URL (change if testing remotely)
BASE_URL="${1:-http://localhost:3000}"

echo "Testing against: $BASE_URL"
echo ""

# Test 1: Basic diagnostic endpoint
echo "1. Testing /debug/webapp endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/debug/webapp")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Endpoint reachable (HTTP $HTTP_CODE)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}✗${NC} Failed (HTTP $HTTP_CODE)"
    echo "$BODY"
fi
echo ""

# Test 2: Asset verification endpoint
echo "2. Testing /debug/webapp/verify-assets endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/debug/webapp/verify-assets")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Endpoint reachable (HTTP $HTTP_CODE)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}✗${NC} Failed (HTTP $HTTP_CODE)"
    echo "$BODY"
fi
echo ""

# Test 3: Check /app route
echo "3. Testing /app route (mini app entry point)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -I "$BASE_URL/app")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} /app accessible (HTTP $HTTP_CODE)"
    echo "$RESPONSE" | head -n-1 | grep -i "content-type"
else
    echo -e "${RED}✗${NC} /app failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test 4: Check a sample _next static asset
echo "4. Testing /_next/static assets..."
# Get a sample asset from the diagnostic endpoint first
SAMPLE_ASSET=$(curl -s "$BASE_URL/debug/webapp" | jq -r '.sampleAsset // empty')

if [ -n "$SAMPLE_ASSET" ]; then
    echo "   Sample asset: $SAMPLE_ASSET"
    RESPONSE=$(curl -s -w "\n%{http_code}" -I "$BASE_URL$SAMPLE_ASSET")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓${NC} Static asset accessible (HTTP $HTTP_CODE)"
        echo "$RESPONSE" | head -n-1 | grep -i "content-type"
    else
        echo -e "${RED}✗${NC} Static asset failed (HTTP $HTTP_CODE)"
    fi
else
    echo -e "${YELLOW}⚠${NC} No sample asset found in diagnostic"
fi
echo ""

echo "=== Diagnostic Complete ==="
echo ""
echo "If all tests pass:"
echo "  • WebApp build exists and is mounted correctly"
echo "  • Access mini app at: $BASE_URL/app"
echo ""
echo "If tests fail:"
echo "  • Check server is running: pm2 status pnptv-bot"
echo "  • Check logs: pm2 logs pnptv-bot"
echo "  • Verify .env.production has correct WEB_APP_URL"
echo "  • Rebuild webapp if needed: cd src/webapp && npm run build"
