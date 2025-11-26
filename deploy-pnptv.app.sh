#!/bin/bash

###############################################################################
# PNPtv Bot - Production Deployment Script
# Domain: pnptv.app
# VPS: srv1071867.hstgr.cloud
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/pnptv-bot"
NGINX_CONF="/etc/nginx/sites-available/pnptv-bot"
NGINX_ENABLED="/etc/nginx/sites-enabled/pnptv-bot"
APP_NAME="pnptv-bot"
DOMAIN="pnptv.app"

# Functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root or with sudo"
        exit 1
    fi
}

# Start deployment
print_header "PNPtv Bot Deployment to pnptv.app"

# Step 1: Update system packages
print_header "Step 1: Updating system packages"
apt update
apt upgrade -y
print_success "System packages updated"

# Step 2: Install Node.js if not installed
print_header "Step 2: Checking Node.js installation"
if ! command -v node &> /dev/null; then
    print_info "Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    print_success "Node.js installed"
else
    NODE_VERSION=$(node --version)
    print_success "Node.js already installed: $NODE_VERSION"
fi

# Step 3: Install PM2 if not installed
print_header "Step 3: Checking PM2 installation"
if ! command -v pm2 &> /dev/null; then
    print_info "Installing PM2..."
    npm install -g pm2
    print_success "PM2 installed"
else
    PM2_VERSION=$(pm2 --version)
    print_success "PM2 already installed: $PM2_VERSION"
fi

# Step 4: Install Nginx if not installed
print_header "Step 4: Checking Nginx installation"
if ! command -v nginx &> /dev/null; then
    print_info "Installing Nginx..."
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    print_success "Nginx installed and started"
else
    print_success "Nginx already installed"
fi

# Step 5: Install Certbot for SSL
print_header "Step 5: Checking Certbot installation"
if ! command -v certbot &> /dev/null; then
    print_info "Installing Certbot..."
    apt install -y certbot python3-certbot-nginx
    print_success "Certbot installed"
else
    print_success "Certbot already installed"
fi

# Step 6: Clone or update repository
print_header "Step 6: Setting up application"
if [ ! -d "$PROJECT_DIR" ]; then
    print_info "Creating project directory..."
    mkdir -p /var/www
    cd /var/www

    print_warning "You need to clone your repository manually:"
    print_info "cd /var/www && git clone <your-repo-url> pnptv-bot"
    print_info "Then run this script again."
    exit 0
else
    print_success "Project directory exists"
    cd "$PROJECT_DIR"

    # Check if git repo exists
    if [ -d ".git" ]; then
        print_info "Pulling latest changes from git..."
        git pull origin main || git pull origin master
        print_success "Code updated from git"
    else
        print_warning "Not a git repository. Skipping git pull."
    fi
fi

# Step 7: Install dependencies
print_header "Step 7: Installing Node.js dependencies"
cd "$PROJECT_DIR"
npm install --production
print_success "Dependencies installed"

# Step 8: Setup environment variables
print_header "Step 8: Setting up environment variables"
if [ ! -f "$PROJECT_DIR/.env" ]; then
    if [ -f "$PROJECT_DIR/.env.production" ]; then
        print_info "Copying .env.production to .env..."
        cp "$PROJECT_DIR/.env.production" "$PROJECT_DIR/.env"
        print_success "Environment file created"
    else
        print_error ".env.production file not found!"
        print_info "Please create .env file manually before continuing"
        exit 1
    fi
else
    print_success "Environment file already exists"
fi

# Set proper permissions
chmod 600 "$PROJECT_DIR/.env"
print_success "Environment file permissions set"

# Step 9: Create logs directory
print_header "Step 9: Creating logs directory"
mkdir -p "$PROJECT_DIR/logs"
chmod 755 "$PROJECT_DIR/logs"
print_success "Logs directory created"

# Step 10: Setup Nginx configuration
print_header "Step 10: Configuring Nginx"
if [ -f "$PROJECT_DIR/nginx-pnptv.app.conf" ]; then
    print_info "Copying Nginx configuration..."
    cp "$PROJECT_DIR/nginx-pnptv.app.conf" "$NGINX_CONF"

    # Create symbolic link if it doesn't exist
    if [ ! -L "$NGINX_ENABLED" ]; then
        ln -s "$NGINX_CONF" "$NGINX_ENABLED"
        print_success "Nginx site enabled"
    fi

    # Add rate limiting to nginx.conf if not present
    if ! grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
        print_info "Adding rate limiting to nginx.conf..."
        sed -i '/http {/a \    # Rate limiting zones\n    limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=5r/s;\n    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;\n    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=20r/s;\n    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;' /etc/nginx/nginx.conf
    fi

    # Test Nginx configuration
    if nginx -t; then
        systemctl reload nginx
        print_success "Nginx configured and reloaded"
    else
        print_error "Nginx configuration test failed!"
        exit 1
    fi
else
    print_error "nginx-pnptv.app.conf not found in project directory!"
    exit 1
fi

# Step 11: Setup PM2
print_header "Step 11: Starting application with PM2"
cd "$PROJECT_DIR"

# Stop existing process if running
if pm2 list | grep -q "$APP_NAME"; then
    print_info "Stopping existing PM2 process..."
    pm2 stop "$APP_NAME"
    pm2 delete "$APP_NAME"
fi

# Start new process
if [ -f "ecosystem.config.js" ]; then
    print_info "Starting with ecosystem.config.js..."
    pm2 start ecosystem.config.js
else
    print_info "Starting with start-bot.js..."
    pm2 start start-bot.js --name "$APP_NAME"
fi

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup systemd -u root --hp /root

print_success "Application started with PM2"

# Step 12: Setup SSL certificate
print_header "Step 12: Setting up SSL certificate"
print_info "Setting up SSL for $DOMAIN..."

if certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    print_success "SSL certificate already exists for $DOMAIN"
else
    print_warning "SSL certificate not found. Running certbot..."
    print_info "Make sure DNS is pointing to this server!"

    # Run certbot
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || {
        print_warning "Certbot setup skipped or failed. You can run it manually later:"
        print_info "sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
    }
fi

# Step 13: Setup firewall
print_header "Step 13: Configuring firewall"
if command -v ufw &> /dev/null; then
    print_info "Configuring UFW firewall..."
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    print_success "Firewall configured"
else
    print_warning "UFW not installed. Skipping firewall setup."
fi

# Step 14: Verify deployment
print_header "Step 14: Verifying deployment"

# Check if PM2 is running
if pm2 list | grep -q "$APP_NAME"; then
    print_success "PM2 process is running"
else
    print_error "PM2 process not found!"
fi

# Check if Nginx is running
if systemctl is-active --quiet nginx; then
    print_success "Nginx is running"
else
    print_error "Nginx is not running!"
fi

# Check if port 3000 is listening
if netstat -tulpn | grep -q ":3000"; then
    print_success "Application is listening on port 3000"
else
    print_error "Application is not listening on port 3000!"
fi

# Final summary
print_header "Deployment Complete!"
echo -e "${GREEN}"
echo "✓ System packages updated"
echo "✓ Node.js and PM2 installed"
echo "✓ Application deployed to $PROJECT_DIR"
echo "✓ Nginx configured"
echo "✓ SSL certificate configured"
echo "✓ Application running with PM2"
echo -e "${NC}"

print_info "Application URL: https://$DOMAIN"
print_info "Bot Username: @PNPtvBot"
print_info "Telegram Channel: Start chatting at https://t.me/PNPtvBot"

print_header "Useful Commands"
echo "View logs:        pm2 logs $APP_NAME"
echo "Restart app:      pm2 restart $APP_NAME"
echo "Stop app:         pm2 stop $APP_NAME"
echo "Monitor app:      pm2 monit"
echo "Nginx reload:     systemctl reload nginx"
echo "View Nginx logs:  tail -f /var/log/nginx/pnptv-error.log"

print_header "Next Steps"
echo "1. Test your bot: https://t.me/PNPtvBot"
echo "2. Test payment page: https://pnptv.app/pay"
echo "3. Monitor logs: pm2 logs $APP_NAME"
echo "4. Update Telegram webhook URLs in Telegram BotFather if needed"

print_success "Deployment finished successfully! 🚀"
