#!/bin/bash
# TRON Mission Control Monitor - Orchestration check
# Uses local model via ollama to keep it lightweight

set -e

WORKSPACE="/Users/mattbruce/.openclaw/workspace/projects/Web/alex-mission-control"
cd "$WORKSPACE"

# Get API key from .env
export $(grep -v '^#' .env | xargs)
API_KEY="${API_KEY:-}"
BASE_URL="http://localhost:4000"

echo "=== TRON MONITOR CHECK ==="
echo "API Key: ${API_KEY:0:8}..."

# Function to get tasks with status
get_tasks() {
    local status=$1
    curl -s -H "Authorization: Bearer $API_KEY" \
         "${BASE_URL}/api/tasks?status=${status}&limit=50" | jq -c '.[]'
}

# Check for tasks in each status
TASKS_BACKLOG=$(get_tasks "Backlog")
TASKS_INPROGRESS=$(get_tasks "In Progress")
TASKS_REVIEW=$(get_tasks "Review")

echo ""
echo "=== ANALYZING TASKS ==="

ALERT_NEEDED=false
ALERT_TYPE=""
ALERT_TASK_ID=""
ALERT_AGENT=""
ALERT_REASON=""

# Check Backlog tasks for routing needs
echo "Checking Backlog tasks..."
echo "$TASKS_BACKLOG" | jq -c 'select(. != null)' | while read -r task; do
    if [ -n "$task" ]; then
        TASK_ID=$(echo "$task" | jq -r '.id')
        OWNER=$(echo "$task" | jq -r '.owner')
        LAST_COMMENT=$(echo "$task" | jq -r '.lastCommentAt')
        
        echo "  - Task $TASK_ID: owner=$OWNER, lastComment=$LAST_COMMENT"
        
        # Check if no owner assigned
        if [ "$OWNER" == "null" ] || [ "$OWNER" == "unassigned" ] || [ -z "$OWNER" ]; then
            echo "  ** NEEDS ROUTING ** - No owner assigned"
            echo "ROUTE:$TASK_ID"
        fi
    fi
done > /tmp/tron_backlog_check.txt

# Check In Progress tasks for stuck agents
echo "Checking In Progress tasks..."
echo "$TASKS_INPROGRESS" | jq -c 'select(. != null)' | while read -r task; do
    if [ -n "$task" ]; then
        TASK_ID=$(echo "$task" | jq -r '.id')
        OWNER=$(echo "$task" | jq -r '.owner')
        LAST_COMMENT=$(echo "$task" | jq -r '.lastCommentAt')
        LAST_ACTIVITY=$(echo "$task" | jq -r '.lastActivityAt')
        
        # Convert to epoch
        if [ "$LAST_ACTIVITY" != "null" ] && [ -n "$LAST_ACTIVITY" ]; then
            ACTIVITY_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S.%3NZ" "$LAST_ACTIVITY" "+%s" 2>/dev/null || echo "0")
            NOW_EPOCH=$(date "+%s")
            ELAPSED=$((NOW_EPOCH - ACTIVITY_EPOCH))
            
            echo "  - Task $TASK_ID: owner=$OWNER, elapsed=${ELAPSED}s"
            
            # Check if agent stuck (> 1200 seconds = 20 min)
            if [ "$ELAPSED" -gt 1200 ]; then
                echo "STUCK:$TASK_ID:$OWNER"
            fi
        fi
    fi
done > /tmp/tron_progress_check.txt

# Check Review tasks
echo "Checking Review tasks..."
echo "$TASKS_REVIEW" | jq -c 'select(. != null)' | while read -r task; do
    if [ -n "$task" ]; then
        TASK_ID=$(echo "$task" | jq -r '.id')
        OWNER=$(echo "$task" | jq -r '.owner')
        
        echo "  - Task $TASK_ID: owner=$OWNER, needs_review"
        echo "REVIEW:$TASK_ID:$OWNER"
    fi
done > /tmp/tron_review_check.txt

echo ""
echo "=== AGGREGATING RESULTS ==="

# Aggregate results
if grep -q "^ROUTE:" /tmp/tron_backlog_check.txt 2>/dev/null; then
    ROUTE_TASK=$(grep "^ROUTE:" /tmp/tron_backlog_check.txt | head -1 | cut -d: -f2)
    echo "ACTION: task_needs_routing on $ROUTE_TASK"
elif grep -q "^STUCK:" /tmp/tron_progress_check.txt 2>/dev/null; then
    STUCK_LINE=$(grep "^STUCK:" /tmp/tron_progress_check.txt | head -1)
    STUCK_TASK=$(echo "$STUCK_LINE" | cut -d: -f2)
    STUCK_AGENT=$(echo "$STUCK_LINE" | cut -d: -f3)
    echo "ACTION: agent_stuck on $STUCK_TASK ($STUCK_AGENT)"
elif grep -q "^REVIEW:" /tmp/tron_review_check.txt 2>/dev/null; then
    REVIEW_LINE=$(grep "^REVIEW:" /tmp/tron_review_check.txt | head -1)
    REVIEW_TASK=$(echo "$REVIEW_LINE" | cut -d: -f2)
    REVIEW_AGENT=$(echo "$REVIEW_LINE" | cut -d: -f3)
    echo "ACTION: task_needs_review on $REVIEW_TASK ($REVIEW_AGENT)"
else
    echo "ACTION: NONE - All agents active"
fi

# Cleanup
rm -f /tmp/tron_*.txt
