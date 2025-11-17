#!/bin/bash
# Manual Test Script for Task Notification Cron
# This script manually invokes the check-task-notifications edge function

# Configuration
PROJECT_REF="xijoybubtrgbrhquqwrx"
FUNCTION_NAME="check-task-notifications"

# Get service role key from environment or prompt
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  SUPABASE_SERVICE_ROLE_KEY not found in environment"
    echo "Please set it or enter it now:"
    read -s SERVICE_ROLE_KEY
else
    SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
fi

# Build the function URL
FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_NAME}"

echo ""
echo "🚀 Testing Task Notification Cron Function"
echo "============================================================"
echo "Function URL: $FUNCTION_URL"
echo "Time: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "============================================================"
echo ""

# Make the request
echo "📡 Sending request..."
response=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json")

# Split response and HTTP status code
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    echo ""
    echo "✅ SUCCESS!"
    echo "============================================================"
    echo "$body" | jq '.'
    
    echo ""
    echo "📊 Summary:"
    echo "$body" | jq -r '
        "  Tasks Checked: \(.tasks_checked // 0)",
        "  Ready Notifications: \(.ready_notifications // 0)",
        "  Late Notifications: \(.late_notifications // 0)",
        "  Total Notifications: \(.total_notifications // 0)",
        "  Errors: \(.errors_count // 0)",
        "  Warnings: \(.warnings_count // 0)",
        "  Execution Time: \(.execution_time_ms // 0)ms"
    '
    
    errors=$(echo "$body" | jq '.errors_count // 0')
    if [ "$errors" -gt 0 ]; then
        echo ""
        echo "❌ Errors Found:"
        echo "$body" | jq -r '.metrics.errors[]? | "  - [\(.context)] \(.error)\(if .taskId then "\n    Task ID: \(.taskId)" else "" end)"'
    fi
    
    warnings=$(echo "$body" | jq '.warnings_count // 0')
    if [ "$warnings" -gt 0 ]; then
        echo ""
        echo "⚠️  Warnings:"
        echo "$body" | jq -r '.metrics.warnings[]? | "  - \(.message)\(if .taskId then "\n    Task ID: \(.taskId)" else "" end)"'
    fi
    
    echo ""
    echo "✅ Test completed successfully!"
else
    echo ""
    echo "❌ ERROR!"
    echo "============================================================"
    echo "HTTP Status Code: $http_code"
    echo ""
    echo "Response Body:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    
    echo ""
    echo "💡 Troubleshooting:"
    echo "  1. Check that the function is deployed: supabase functions deploy check-task-notifications"
    echo "  2. Verify SERVICE_ROLE_KEY is correct in Supabase Dashboard → Settings → API"
    echo "  3. Check function logs in Supabase Dashboard → Edge Functions → check-task-notifications → Logs"
    
    exit 1
fi

