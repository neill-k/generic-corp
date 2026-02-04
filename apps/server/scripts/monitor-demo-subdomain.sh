#!/bin/bash
# Demo Subdomain Monitoring Script
# Owner: Yuki Tanaka
# Purpose: Health check for demo.genericcorp.com

# Configuration
SUBDOMAIN="demo.genericcorp.com"
ALERT_EMAIL="team@genericcorp.com"
RESPONSE_TIME_THRESHOLD=2000  # milliseconds
LOG_FILE="/var/log/demo-subdomain-monitor.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Timestamp function
timestamp() {
    date "+%Y-%m-%d %H:%M:%S"
}

# Log function
log() {
    echo "[$(timestamp)] $1" | tee -a "$LOG_FILE"
}

# Alert function (placeholder - integrate with actual alerting system)
send_alert() {
    local subject="$1"
    local message="$2"
    log "ALERT: $subject - $message"
    # TODO: Integrate with actual email/Slack alerting
    # echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
}

# Check 1: HTTP to HTTPS redirect
check_https_redirect() {
    log "Checking HTTP to HTTPS redirect..."
    response=$(curl -s -o /dev/null -w "%{http_code}" -L http://$SUBDOMAIN)

    if [ "$response" == "200" ]; then
        echo -e "${GREEN}✓${NC} HTTPS redirect working"
        log "✓ HTTPS redirect: OK"
        return 0
    else
        echo -e "${RED}✗${NC} HTTPS redirect failed (HTTP $response)"
        log "✗ HTTPS redirect: FAILED (HTTP $response)"
        send_alert "Demo Subdomain - HTTPS Redirect Failed" "HTTP redirect returned $response"
        return 1
    fi
}

# Check 2: Site availability
check_availability() {
    log "Checking site availability..."
    response=$(curl -s -o /dev/null -w "%{http_code}" https://$SUBDOMAIN)

    if [ "$response" == "200" ]; then
        echo -e "${GREEN}✓${NC} Site is available (HTTP 200)"
        log "✓ Availability: OK"
        return 0
    else
        echo -e "${RED}✗${NC} Site returned HTTP $response"
        log "✗ Availability: FAILED (HTTP $response)"
        send_alert "Demo Subdomain - Site Down" "HTTPS request returned $response"
        return 1
    fi
}

# Check 3: Response time
check_response_time() {
    log "Checking response time..."

    response_time=$(curl -o /dev/null -s -w '%{time_total}\n' https://$SUBDOMAIN)
    response_time_ms=$(echo "$response_time * 1000" | bc | cut -d'.' -f1)

    if [ "$response_time_ms" -lt "$RESPONSE_TIME_THRESHOLD" ]; then
        echo -e "${GREEN}✓${NC} Response time: ${response_time_ms}ms (threshold: ${RESPONSE_TIME_THRESHOLD}ms)"
        log "✓ Response time: ${response_time_ms}ms"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Response time: ${response_time_ms}ms (exceeds threshold: ${RESPONSE_TIME_THRESHOLD}ms)"
        log "⚠ Response time: ${response_time_ms}ms (SLOW)"
        send_alert "Demo Subdomain - Slow Response" "Response time: ${response_time_ms}ms (threshold: ${RESPONSE_TIME_THRESHOLD}ms)"
        return 1
    fi
}

# Check 4: SSL certificate validity
check_ssl_certificate() {
    log "Checking SSL certificate..."

    # Get certificate expiry date
    expiry_date=$(echo | openssl s_client -connect $SUBDOMAIN:443 -servername $SUBDOMAIN 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

    if [ -z "$expiry_date" ]; then
        echo -e "${RED}✗${NC} Failed to retrieve SSL certificate"
        log "✗ SSL certificate: FAILED to retrieve"
        send_alert "Demo Subdomain - SSL Certificate Error" "Could not retrieve SSL certificate"
        return 1
    fi

    # Calculate days until expiry
    expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry_date" +%s 2>/dev/null)
    current_epoch=$(date +%s)
    days_until_expiry=$(( ($expiry_epoch - $current_epoch) / 86400 ))

    if [ "$days_until_expiry" -gt 30 ]; then
        echo -e "${GREEN}✓${NC} SSL certificate valid (expires in $days_until_expiry days)"
        log "✓ SSL certificate: OK (expires in $days_until_expiry days)"
        return 0
    elif [ "$days_until_expiry" -gt 7 ]; then
        echo -e "${YELLOW}⚠${NC} SSL certificate expires in $days_until_expiry days"
        log "⚠ SSL certificate: WARNING (expires in $days_until_expiry days)"
        send_alert "Demo Subdomain - SSL Expiring Soon" "Certificate expires in $days_until_expiry days"
        return 1
    else
        echo -e "${RED}✗${NC} SSL certificate expires in $days_until_expiry days (CRITICAL)"
        log "✗ SSL certificate: CRITICAL (expires in $days_until_expiry days)"
        send_alert "Demo Subdomain - SSL Expiring CRITICAL" "Certificate expires in $days_until_expiry days"
        return 1
    fi
}

# Check 5: DNS resolution
check_dns_resolution() {
    log "Checking DNS resolution..."

    dns_result=$(dig +short $SUBDOMAIN)

    if [ -n "$dns_result" ]; then
        echo -e "${GREEN}✓${NC} DNS resolves to: $dns_result"
        log "✓ DNS resolution: OK ($dns_result)"
        return 0
    else
        echo -e "${RED}✗${NC} DNS resolution failed"
        log "✗ DNS resolution: FAILED"
        send_alert "Demo Subdomain - DNS Resolution Failed" "Unable to resolve $SUBDOMAIN"
        return 1
    fi
}

# Check 6: Content verification (optional)
check_content() {
    log "Checking content..."

    # Check if the page contains expected content
    # Adjust the grep pattern based on actual landing page content
    content=$(curl -s https://$SUBDOMAIN)

    if echo "$content" | grep -q -i "generic corp\|landing\|demo" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Expected content found"
        log "✓ Content verification: OK"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Expected content not found (page may be incorrect)"
        log "⚠ Content verification: WARNING (expected content not found)"
        # Not critical, so not sending alert
        return 1
    fi
}

# Main monitoring function
run_all_checks() {
    echo "========================================="
    echo "Demo Subdomain Health Check"
    echo "Target: https://$SUBDOMAIN"
    echo "Timestamp: $(timestamp)"
    echo "========================================="
    echo ""

    log "Starting health check for $SUBDOMAIN"

    local failed_checks=0

    check_dns_resolution || ((failed_checks++))
    check_https_redirect || ((failed_checks++))
    check_availability || ((failed_checks++))
    check_response_time || ((failed_checks++))
    check_ssl_certificate || ((failed_checks++))
    check_content || ((failed_checks++))

    echo ""
    echo "========================================="
    if [ "$failed_checks" -eq 0 ]; then
        echo -e "${GREEN}All checks passed!${NC}"
        log "Health check completed: ALL PASSED"
    else
        echo -e "${RED}$failed_checks check(s) failed${NC}"
        log "Health check completed: $failed_checks FAILED"
    fi
    echo "========================================="

    return $failed_checks
}

# Run monitoring
run_all_checks

# Exit with the number of failed checks (0 = success)
exit $?
