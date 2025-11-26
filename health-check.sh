#!/bin/bash

# WebApp & Bot Health Check - November 11, 2025
# Verifies both the Next.js WebApp and Express Bot are running correctly

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     PNPtv Bot & WebApp Health Check (Nov 11, 2025)        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check endpoint
check_endpoint() {
  local name=$1
  local url=$2
  local expected_code=$3
  
  response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1)
  
  if [ "$response" = "$expected_code" ]; then
    echo -e "${GREEN}✅${NC} $name: HTTP $response"
    return 0
  else
    echo -e "${RED}❌${NC} $name: HTTP $response (expected $expected_code)"
    return 1
  fi
}

# Function to check PM2 process
check_pm2_process() {
  local name=$1
  local status=$(pm2 status | grep "$name" | awk '{print $NF}')
  
  if [ "$status" = "online" ]; then
    pid=$(pm2 status | grep "$name" | awk '{print $6}')
    mem=$(pm2 status | grep "$name" | awk '{print $10}')
    echo -e "${GREEN}✅${NC} $name: ONLINE (PID: $pid, Memory: $mem)"
    return 0
  else
    echo -e "${RED}❌${NC} $name: $status"
    return 1
  fi
}

# Function to check port
check_port() {
  local port=$1
  local service=$2
  
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Port $port ($service): LISTENING"
    return 0
  else
    echo -e "${RED}❌${NC} Port $port ($service): NOT LISTENING"
    return 1
  fi
}

echo "━━━ LOCAL SERVICE STATUS ━━━"
check_pm2_process "pnptv-bot"
check_pm2_process "pnptv-webapp"

echo ""
echo "━━━ PORT STATUS ━━━"
check_port 3000 "Express Bot"
check_port 3002 "Next.js WebApp"
check_port 443 "Nginx HTTPS"

echo ""
echo "━━━ ENDPOINT HEALTH ━━━"

# Bot endpoints
check_endpoint "Bot Health" "http://localhost:3000/health" "200"
check_endpoint "Bot Root" "http://localhost:3000/" "200"

# WebApp endpoints
check_endpoint "WebApp (localhost)" "http://localhost:3002" "200"
check_endpoint "WebApp /app route" "http://localhost:3002/app" "200"

echo ""
echo "━━━ HTTPS ENDPOINTS (via Nginx) ━━━"
check_endpoint "Main Domain" "https://pnptv.app/" "200"
check_endpoint "WebApp /app" "https://pnptv.app/app" "200"
check_endpoint "WebApp Diagnostics" "https://pnptv.app/debug/webapp" "200"

echo ""
echo "━━━ NGINX STATUS ━━━"
if sudo nginx -t 2>&1 | grep -q "successful"; then
  echo -e "${GREEN}✅${NC} Nginx Configuration: VALID"
else
  echo -e "${RED}❌${NC} Nginx Configuration: INVALID"
fi

# Count total processes
echo ""
echo "━━━ PROCESS SUMMARY ━━━"
total=$(pm2 status | grep -E "pnptv-bot|pnptv-webapp" | wc -l)
online=$(pm2 status | grep -E "pnptv-bot|pnptv-webapp" | grep "online" | wc -l)

if [ "$online" -eq "$total" ]; then
  echo -e "${GREEN}✅${NC} All processes ONLINE ($online/$total)"
else
  echo -e "${RED}❌${NC} Some processes DOWN ($online/$total)"
fi

echo ""
echo "━━━ LOG TAIL (Recent Errors) ━━━"
errors_bot=$(pm2 logs pnptv-bot --nostream 2>&1 | grep -i "error" | wc -l)
errors_webapp=$(pm2 logs pnptv-webapp --nostream 2>&1 | grep -i "error" | wc -l)

if [ "$errors_bot" -eq 0 ] && [ "$errors_webapp" -eq 0 ]; then
  echo -e "${GREEN}✅${NC} No recent errors detected"
else
  echo -e "${YELLOW}⚠️${NC} Bot errors: $errors_bot, WebApp errors: $errors_webapp"
  echo ""
  echo "Recent Bot Errors:"
  pm2 logs pnptv-bot --nostream 2>&1 | grep -i "error" | tail -3
  echo ""
  echo "Recent WebApp Errors:"
  pm2 logs pnptv-webapp --nostream 2>&1 | grep -i "error" | tail -3
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Check Complete                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
