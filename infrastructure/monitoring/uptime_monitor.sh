#!/bin/bash
# Uptime monitoring script for demo.genericcorp.com
# Run this via cron: */5 * * * * /path/to/uptime_monitor.sh

DOMAIN="${DEMO_DOMAIN:-demo.genericcorp.com}"
WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"  # Optional Slack webhook
LOG_FILE="/var/log/demo-uptime.log"

# Health check
check_health() {
    local url="https://$DOMAIN/health"
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)

    if [ "$response" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Performance check
check_performance() {
    local url="https://$DOMAIN"
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' "$url" --max-time 10)

    # Warning if > 2 seconds
    if (( $(echo "$response_time > 2.0" | bc -l) )); then
        echo "WARNING: Slow response time: ${response_time}s" | tee -a "$LOG_FILE"
        notify "⚠️ Demo site slow response: ${response_time}s"
    fi

    echo "Response time: ${response_time}s" >> "$LOG_FILE"
}

# Notify via Slack
notify() {
    local message="$1"

    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$WEBHOOK_URL" 2>/dev/null
    fi

    # Log to file
    echo "$(date): $message" >> "$LOG_FILE"
}

# Main monitoring loop
main() {
    if check_health; then
        check_performance
    else
        notify "🔴 Demo site down: $DOMAIN"
        echo "$(date): Health check failed for $DOMAIN" >> "$LOG_FILE"
    fi
}

main
