#!/bin/bash

###############################################################################
# VPS Deployment Script - PNPtv Telegram Bot
# Server: srv1071867.hstgr.cloud
#
# Usage:
#   ./deploy-vps.sh [options]
#
# Options:
#   --setup     First time setup (installs dependencies)
#   --update    Update application only (default)
#   --full      Full deployment (git pull, npm install, restart)
#   --rollback  Rollback to previous version
#   --logs      View application logs
#   --status    Check application status
#
# Examples:
#   ./deploy-vps.sh --setup    # First deployment
#   ./deploy-vps.sh            # Quick update
#   ./deploy-vps.sh --full     # Full deployment
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="pnptv-bot"
APP_DIR="/var/www/pnptv-bot"
BRANCH="main"
BACKUP_DIR="/var/backups/pnptv-bot"
LOG_FILE="$APP_DIR/logs/deploy.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE" 2>/dev/null || true
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[ERROR] $1" >> "$LOG_FILE" 2>/dev/null || true
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if script is run with sudo for certain operations
check_sudo() {
    if [ "$EUID" -eq 0 ]; then
        warning "Running as root. This is not recommended for normal deployments."
    fi
}

# Check if directory exists
check_directory() {
    if [ ! -d "$APP_DIR" ]; then
        error "Application directory not found: $APP_DIR"
    fi
}

# Backup current version
backup_app() {
    log "Creating backup..."

    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"

    # Create backup with timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

    cd "$APP_DIR"
    tar -czf "$BACKUP_FILE" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='logs' \
        --exclude='sessions.json' \
        .

    log "Backup created: $BACKUP_FILE"

    # Keep only last 5 backups
    ls -t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +6 | xargs -r rm
    log "Old backups cleaned up"
}

# Setup - First time deployment
setup() {
    log "Starting first-time setup..."

    # Update system
    info "Updating system packages..."
    sudo apt update && sudo apt upgrade -y

    # Install Node.js if not installed
    if ! command -v node &> /dev/null; then
        info "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
    else
        info "Node.js already installed: $(node --version)"
    fi

    # Install PM2 if not installed
    if ! command -v pm2 &> /dev/null; then
        info "Installing PM2..."
        sudo npm install -g pm2
    else
        info "PM2 already installed: $(pm2 --version)"
    fi

    # Install Nginx if not installed
    if ! command -v nginx &> /dev/null; then
        info "Installing Nginx..."
        sudo apt install -y nginx
        sudo systemctl enable nginx
        sudo systemctl start nginx
    else
        info "Nginx already installed"
    fi

    # Clone repository if not exists
    if [ ! -d "$APP_DIR" ]; then
        info "Cloning repository..."
        sudo mkdir -p /var/www
        cd /var/www
        sudo git clone <YOUR_REPO_URL> pnptv-bot
        sudo chown -R $USER:$USER "$APP_DIR"
    fi

    # Navigate to app directory
    cd "$APP_DIR"

    # Install dependencies
    info "Installing dependencies..."
    npm install --production

    # Create required directories
    mkdir -p logs
    mkdir -p "$BACKUP_DIR"

    # Set permissions
    chmod 755 logs

    # Copy environment file if not exists
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            warning "Created .env from .env.example - PLEASE UPDATE WITH YOUR CREDENTIALS!"
            warning "Edit the file: nano $APP_DIR/.env"
        else
            error ".env.example not found. Please create .env manually."
        fi
    fi

    log "Setup completed! Next steps:"
    info "1. Edit .env file: nano $APP_DIR/.env"
    info "2. Start application: pm2 start ecosystem.config.js"
    info "3. Save PM2 config: pm2 save"
    info "4. Setup auto-start: pm2 startup systemd"
    info "5. Configure Nginx (see VPS_DEPLOYMENT_GUIDE.md)"
}

# Update application
update_app() {
    log "Updating application..."
    check_directory

    cd "$APP_DIR"

    # Get current git hash
    CURRENT_HASH=$(git rev-parse HEAD)
    log "Current version: $CURRENT_HASH"

    # Pull latest changes
    info "Pulling latest changes from $BRANCH..."
    git fetch origin
    git reset --hard origin/$BRANCH

    # Get new git hash
    NEW_HASH=$(git rev-parse HEAD)
    log "New version: $NEW_HASH"

    if [ "$CURRENT_HASH" = "$NEW_HASH" ]; then
        info "No changes detected. Application is up to date."
        return 0
    fi

    log "Changes detected. Proceeding with update..."
}

# Install dependencies
install_deps() {
    log "Installing dependencies..."
    check_directory

    cd "$APP_DIR"
    npm install --production

    log "Dependencies installed successfully"
}

# Restart application
restart_app() {
    log "Restarting application..."

    if pm2 list | grep -q "$APP_NAME"; then
        pm2 restart "$APP_NAME"
        log "Application restarted"
    else
        warning "Application not found in PM2. Starting..."
        pm2 start ecosystem.config.js
        pm2 save
        log "Application started"
    fi
}

# Full deployment
full_deploy() {
    log "Starting full deployment..."

    # Backup current version
    backup_app

    # Update code
    update_app

    # Install dependencies
    install_deps

    # Restart application
    restart_app

    # Check status
    sleep 3
    check_status

    log "Deployment completed successfully!"
}

# Rollback to previous version
rollback() {
    log "Starting rollback..."

    # Find latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | head -n 1)

    if [ -z "$LATEST_BACKUP" ]; then
        error "No backup found for rollback"
    fi

    warning "Rolling back to: $LATEST_BACKUP"
    read -p "Are you sure? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        info "Rollback cancelled"
        exit 0
    fi

    # Stop application
    pm2 stop "$APP_NAME" || true

    # Restore backup
    cd "$APP_DIR"
    tar -xzf "$LATEST_BACKUP"

    # Restart application
    pm2 restart "$APP_NAME"

    log "Rollback completed!"
    check_status
}

# Check application status
check_status() {
    log "Checking application status..."

    # PM2 status
    info "PM2 Status:"
    pm2 list

    # Check if application is running
    if pm2 list | grep -q "$APP_NAME.*online"; then
        log "✓ Application is running"
    else
        error "✗ Application is not running"
    fi

    # Check if port is listening
    if sudo netstat -tulpn | grep -q ":3000"; then
        log "✓ Port 3000 is listening"
    else
        warning "✗ Port 3000 is not listening"
    fi

    # Check Nginx status
    if sudo systemctl is-active --quiet nginx; then
        log "✓ Nginx is running"
    else
        warning "✗ Nginx is not running"
    fi

    # Show recent logs
    info "Recent logs (last 10 lines):"
    pm2 logs "$APP_NAME" --lines 10 --nostream
}

# View logs
view_logs() {
    info "Viewing application logs (Ctrl+C to exit)..."
    pm2 logs "$APP_NAME"
}

# Main script
main() {
    log "=========================================="
    log "PNPtv Bot Deployment Script"
    log "Server: srv1071867.hstgr.cloud"
    log "=========================================="

    check_sudo

    # Parse arguments
    case "${1:-}" in
        --setup)
            setup
            ;;
        --update)
            update_app
            restart_app
            ;;
        --full)
            full_deploy
            ;;
        --rollback)
            rollback
            ;;
        --logs)
            view_logs
            ;;
        --status)
            check_status
            ;;
        --help|-h)
            cat << EOF
PNPtv Bot Deployment Script

Usage: $0 [options]

Options:
  --setup     First time setup (installs dependencies)
  --update    Update application only (default)
  --full      Full deployment (git pull, npm install, restart)
  --rollback  Rollback to previous version
  --logs      View application logs
  --status    Check application status
  --help      Show this help message

Examples:
  $0 --setup    # First deployment
  $0            # Quick update (default)
  $0 --full     # Full deployment
  $0 --status   # Check status
EOF
            exit 0
            ;;
        "")
            # Default: quick update
            update_app
            restart_app
            ;;
        *)
            error "Unknown option: $1. Use --help for usage information."
            ;;
    esac

    log "Done!"
}

# Run main function
main "$@"
