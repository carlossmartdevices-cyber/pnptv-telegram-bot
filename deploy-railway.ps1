# Railway Deployment Script (PowerShell)
# Optimized deployment script for PNPtv Telegram Bot on Windows

$ErrorActionPreference = "Stop"

Write-Host "🚀 Railway Deployment Script" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check if railway CLI is installed
$railwayInstalled = Get-Command railway -ErrorAction SilentlyContinue

if (-not $railwayInstalled) {
    Write-Host "❌ Railway CLI not found" -ForegroundColor Red
    Write-Host "Please install it first:" -ForegroundColor Yellow
    Write-Host "  npm install -g @railway/cli" -ForegroundColor White
    exit 1
}

Write-Host "✅ Railway CLI detected" -ForegroundColor Green
Write-Host ""

# Check if logged in
try {
    railway whoami 2>&1 | Out-Null
    Write-Host "✅ Authenticated" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Not logged in to Railway" -ForegroundColor Yellow
    Write-Host "Logging in..." -ForegroundColor Yellow
    railway login
}

Write-Host ""

# Check if linked to project
try {
    railway status 2>&1 | Out-Null
    Write-Host "✅ Project linked" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Not linked to a Railway project" -ForegroundColor Yellow
    Write-Host "Please link to your project:" -ForegroundColor White
    Write-Host "  1. Link existing project: railway link" -ForegroundColor White
    Write-Host "  2. Or create new project: railway init" -ForegroundColor White
    exit 1
}

Write-Host ""

# Show current status
Write-Host "📊 Current Status:" -ForegroundColor Blue
railway status
Write-Host ""

# Ask for confirmation
$confirmation = Read-Host "Deploy to Railway? (y/n)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

# Pre-deployment checks
Write-Host ""
Write-Host "🔍 Running pre-deployment checks..." -ForegroundColor Blue

# Check for required files
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json not found" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "start-bot.js")) {
    Write-Host "❌ start-bot.js not found" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Required files present" -ForegroundColor Green

# Check for uncommitted changes (optional warning)
if (Test-Path ".git") {
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Host "⚠️  Warning: You have uncommitted changes" -ForegroundColor Yellow
        Write-Host "Consider committing them before deploying" -ForegroundColor Yellow
        $continueAnyway = Read-Host "Continue anyway? (y/n)"
        if ($continueAnyway -ne 'y' -and $continueAnyway -ne 'Y') {
            Write-Host "Deployment cancelled" -ForegroundColor Yellow
            exit 0
        }
    }
}

# Deploy
Write-Host ""
Write-Host "🚀 Deploying to Railway..." -ForegroundColor Blue
Write-Host ""

try {
    railway up

    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Blue
    Write-Host "  1. Check logs: railway logs" -ForegroundColor White
    Write-Host "  2. Check status: railway status" -ForegroundColor White
    Write-Host "  3. Open dashboard: railway open" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  Important: Update your environment variables if needed" -ForegroundColor Yellow
    Write-Host "  - BOT_URL: Your Railway public URL" -ForegroundColor White
    Write-Host "  - WEBHOOK_URL: Your Railway public URL" -ForegroundColor White
    Write-Host "  - EPAYCO_RESPONSE_URL: Update with Railway URL" -ForegroundColor White
    Write-Host "  - EPAYCO_CONFIRMATION_URL: Update with Railway URL" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Write-Host "Check the error messages above" -ForegroundColor Yellow
    Write-Host "Or view logs with: railway logs" -ForegroundColor White
    exit 1
}
