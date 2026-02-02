#!/bin/bash
# Example Claude Code hook script for sending events to the dashboard
#
# To use this hook:
# 1. Make it executable: chmod +x claude-hook-example.sh
# 2. Configure in Claude Code settings to call this script on events
# 3. Set the API_URL environment variable or update the URL below

API_URL="${API_URL:-http://localhost:3000/api/claude-events}"
SESSION_ID="${CLAUDE_SESSION_ID:-$(uuidgen)}"

# Read event data from stdin (Claude Code passes event JSON on stdin)
EVENT_DATA=$(cat)

# Parse event type from the data
EVENT_TYPE=$(echo "$EVENT_DATA" | jq -r '.event // "Unknown"')

# Create the payload
PAYLOAD=$(jq -n \
  --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")" \
  --arg event "$EVENT_TYPE" \
  --arg sessionId "$SESSION_ID" \
  --argjson data "$EVENT_DATA" \
  '{
    timestamp: $timestamp,
    event: $event,
    sessionId: $sessionId,
    data: $data
  }')

# Send to API
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  > /dev/null 2>&1

exit 0
