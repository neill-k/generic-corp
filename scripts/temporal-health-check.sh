#!/bin/bash
# Temporal Health Check Script
# Purpose: Quick diagnostic for Temporal workflow engine health
# Author: Graham "Gray" Sutton, Data Engineer
# Usage: ./temporal-health-check.sh

set -e

echo "=================================================="
echo "Temporal Infrastructure Health Check"
echo "Timestamp: $(date)"
echo "=================================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ ERROR: Docker is not running"
    exit 1
fi

echo "1. Container Status"
echo "-------------------"
docker ps --filter "name=generic-corp" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "generic-corp-(temporal|postgres|redis)"
echo ""

echo "2. Container Resource Usage"
echo "---------------------------"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | head -5
echo ""

echo "3. Temporal Container Health"
echo "----------------------------"
TEMPORAL_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' generic-corp-temporal 2>/dev/null || echo "no healthcheck")
echo "Health Status: $TEMPORAL_HEALTH"

if [ "$TEMPORAL_HEALTH" = "unhealthy" ]; then
    echo "⚠️  WARNING: Temporal is unhealthy!"
    echo ""
    echo "Recent errors (last 20 lines):"
    docker logs generic-corp-temporal --tail 20 2>&1 | grep -i error || echo "No recent errors in last 20 lines"
else
    echo "✅ Temporal is healthy"
fi
echo ""

echo "4. PostgreSQL Connection Status"
echo "--------------------------------"
PG_CONNECTIONS=$(docker exec generic-corp-postgres psql -U genericcorp -d genericcorp -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null || echo "ERROR")
PG_MAX=$(docker exec generic-corp-postgres psql -U genericcorp -d genericcorp -t -c "SELECT setting FROM pg_settings WHERE name='max_connections';" 2>/dev/null || echo "ERROR")

if [ "$PG_CONNECTIONS" != "ERROR" ]; then
    echo "Active Connections: $PG_CONNECTIONS / $PG_MAX"
    CONNECTION_PCT=$(echo "scale=2; ($PG_CONNECTIONS / $PG_MAX) * 100" | bc)
    echo "Utilization: ${CONNECTION_PCT}%"

    if (( $(echo "$CONNECTION_PCT > 80" | bc -l) )); then
        echo "⚠️  WARNING: PostgreSQL connection utilization > 80%"
    else
        echo "✅ PostgreSQL connections healthy"
    fi
else
    echo "❌ ERROR: Cannot query PostgreSQL"
fi
echo ""

echo "5. Redis Status"
echo "---------------"
REDIS_PING=$(docker exec generic-corp-redis redis-cli ping 2>/dev/null || echo "ERROR")
if [ "$REDIS_PING" = "PONG" ]; then
    echo "✅ Redis is responding"

    # Check memory usage
    REDIS_MEM=$(docker exec generic-corp-redis redis-cli info memory | grep used_memory_human | cut -d':' -f2 | tr -d '\r')
    echo "Memory Usage: $REDIS_MEM"
else
    echo "❌ ERROR: Redis not responding"
fi
echo ""

echo "6. Recent Temporal Errors (Last 5 minutes)"
echo "-------------------------------------------"
ERROR_COUNT=$(docker logs generic-corp-temporal --since 5m 2>&1 | grep -c '"level":"error"' || echo "0")
echo "Error Count: $ERROR_COUNT"

if [ "$ERROR_COUNT" -gt 10 ]; then
    echo "⚠️  WARNING: High error rate detected ($ERROR_COUNT errors in 5 minutes)"
    echo ""
    echo "Most common error types:"
    docker logs generic-corp-temporal --since 5m 2>&1 | grep '"level":"error"' | grep -oP '"error":"[^"]*"' | sort | uniq -c | sort -rn | head -5
elif [ "$ERROR_COUNT" -eq 0 ]; then
    echo "✅ No errors in last 5 minutes"
else
    echo "✅ Low error rate (acceptable)"
fi
echo ""

echo "7. Disk Space"
echo "-------------"
df -h / | tail -1 | awk '{print "Root: " $3 " / " $2 " (" $5 " used)"}'
DISK_USED=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USED" -gt 80 ]; then
    echo "⚠️  WARNING: Disk usage > 80%"
else
    echo "✅ Disk space healthy"
fi
echo ""

echo "=================================================="
echo "Health Check Summary"
echo "=================================================="

# Overall assessment
ISSUES=0

if [ "$TEMPORAL_HEALTH" = "unhealthy" ]; then
    echo "❌ Temporal: UNHEALTHY"
    ISSUES=$((ISSUES+1))
else
    echo "✅ Temporal: HEALTHY"
fi

if [ "$PG_CONNECTIONS" != "ERROR" ] && (( $(echo "$CONNECTION_PCT > 80" | bc -l) )); then
    echo "⚠️  PostgreSQL: HIGH CONNECTION USAGE"
    ISSUES=$((ISSUES+1))
elif [ "$PG_CONNECTIONS" = "ERROR" ]; then
    echo "❌ PostgreSQL: ERROR"
    ISSUES=$((ISSUES+1))
else
    echo "✅ PostgreSQL: HEALTHY"
fi

if [ "$REDIS_PING" != "PONG" ]; then
    echo "❌ Redis: NOT RESPONDING"
    ISSUES=$((ISSUES+1))
else
    echo "✅ Redis: HEALTHY"
fi

if [ "$ERROR_COUNT" -gt 10 ]; then
    echo "❌ Error Rate: HIGH ($ERROR_COUNT in 5 min)"
    ISSUES=$((ISSUES+1))
else
    echo "✅ Error Rate: ACCEPTABLE"
fi

if [ "$DISK_USED" -gt 80 ]; then
    echo "⚠️  Disk: HIGH USAGE (${DISK_USED}%)"
    ISSUES=$((ISSUES+1))
else
    echo "✅ Disk: HEALTHY"
fi

echo ""
if [ $ISSUES -eq 0 ]; then
    echo "🎉 Overall Status: ALL SYSTEMS HEALTHY"
    exit 0
elif [ $ISSUES -le 2 ]; then
    echo "⚠️  Overall Status: DEGRADED ($ISSUES issues)"
    exit 1
else
    echo "🔴 Overall Status: CRITICAL ($ISSUES issues)"
    exit 2
fi
