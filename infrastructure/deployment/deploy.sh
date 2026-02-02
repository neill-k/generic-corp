#!/bin/bash
# Demo deployment script for demo.genericcorp.com

set -e

echo "🚀 Generic Corp Demo Deployment Script"
echo "======================================="

# Configuration
DOMAIN="${DEMO_DOMAIN:-demo.genericcorp.com}"
DEPLOY_TYPE="${DEPLOY_TYPE:-vercel}"  # vercel or self-hosted

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if [ "$DEPLOY_TYPE" = "vercel" ]; then
        if ! command -v vercel &> /dev/null; then
            log_error "Vercel CLI not found. Install with: npm i -g vercel"
            exit 1
        fi
    else
        if ! command -v docker &> /dev/null; then
            log_error "Docker not found. Please install Docker."
            exit 1
        fi
    fi

    log_success "Prerequisites checked"
}

# Build landing page
build_landing() {
    log_info "Building landing page..."
    cd ../../apps/landing
    pnpm install
    pnpm build
    log_success "Landing page built"
    cd ../../infrastructure/deployment
}

# Deploy to Vercel
deploy_vercel() {
    log_info "Deploying to Vercel..."

    cd ../../apps/landing
    vercel --prod --yes

    log_success "Deployed to Vercel"
    log_info "Configure custom domain in Vercel dashboard: $DOMAIN"
}

# Deploy self-hosted
deploy_selfhosted() {
    log_info "Deploying self-hosted..."

    # Start Docker containers
    docker-compose -f docker-compose.demo.yml up -d

    log_success "Docker containers started"

    # Setup SSL with certbot
    if [ ! -f "./ssl/live/$DOMAIN/fullchain.pem" ]; then
        log_info "Setting up SSL certificate..."
        docker run -it --rm \
            -v $(pwd)/ssl:/etc/letsencrypt \
            -p 80:80 \
            certbot/certbot certonly --standalone \
            -d "$DOMAIN" \
            --agree-tos \
            --email "ops@genericcorp.com" \
            --non-interactive
        log_success "SSL certificate obtained"
    fi

    # Restart nginx with SSL
    docker-compose -f docker-compose.demo.yml restart demo-nginx

    log_success "Self-hosted deployment complete"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring..."

    # Create uptime check script
    cat > ../monitoring/check_demo.sh <<'EOF'
#!/bin/bash
curl -f https://demo.genericcorp.com/health || exit 1
EOF
    chmod +x ../monitoring/check_demo.sh

    log_success "Monitoring configured"
}

# Main deployment flow
main() {
    echo ""
    log_info "Deployment Type: $DEPLOY_TYPE"
    log_info "Domain: $DOMAIN"
    echo ""

    check_prerequisites
    build_landing

    if [ "$DEPLOY_TYPE" = "vercel" ]; then
        deploy_vercel
    else
        deploy_selfhosted
    fi

    setup_monitoring

    echo ""
    log_success "🎉 Deployment complete!"
    echo ""
    echo "Demo site: https://$DOMAIN"
    echo "Health check: https://$DOMAIN/health"
    echo ""
}

main
