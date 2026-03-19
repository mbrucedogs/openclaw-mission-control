#!/bin/bash

# Default recovery + actionable-queue monitor for Mission Control.
# Run this on a 10-minute schedule to wake the primary orchestrator when:
# - a running stage stalls and is blocked by the recovery scan
# - there is actionable work waiting in the orchestrator queue

set -euo pipefail

WORKSPACE="$(cd "$(dirname "$0")" && pwd)"
cd "$WORKSPACE"

export $(grep -v '^#' .env | xargs)

API_KEY="${API_KEY:-}"
BASE_URL="http://127.0.0.1:4000"

if [ -z "$API_KEY" ]; then
  echo "Missing API_KEY"
  exit 1
fi

echo "=== Mission Control Recovery Scan ==="

RECOVERY_JSON=$(curl -s -H "X-API-Key: $API_KEY" "${BASE_URL}/api/recovery/scan?staleMinutes=20")
ALERT_COUNT=$(echo "$RECOVERY_JSON" | jq -r '.count // 0')

if [ "$ALERT_COUNT" -gt 0 ]; then
  echo "Recovery alerts found: $ALERT_COUNT"
  SUMMARY=$(echo "$RECOVERY_JSON" | jq -r '[.alerts[] | "\(.taskId) step \(.stepId): \(.reason)"] | join("; ")')
  openclaw agent --agent main --message "RECOVERY SCAN: ${ALERT_COUNT} stalled step(s) were blocked for review. ${SUMMARY} Decide whether to retry, reroute, or keep blocked using the task/run/step API."
else
  echo "No stale steps detected."
fi

QUEUE_JSON=$(curl -s -H "X-API-Key: $API_KEY" "${BASE_URL}/api/tasks?queue=max&include=currentRun")
QUEUE_COUNT=$(echo "$QUEUE_JSON" | jq 'length')

if [ "$QUEUE_COUNT" -gt 0 ]; then
  echo "Actionable tasks in orchestrator queue: $QUEUE_COUNT"
  FIRST_TASK=$(echo "$QUEUE_JSON" | jq -r '.[0]')
  TASK_ID=$(echo "$FIRST_TASK" | jq -r '.id')
  TASK_TITLE=$(echo "$FIRST_TASK" | jq -r '.title')
  TASK_STATUS=$(echo "$FIRST_TASK" | jq -r '.status')
  STEP_SUMMARY=$(echo "$FIRST_TASK" | jq -r '
    .currentRun as $run
    | ($run.steps // []) as $steps
    | ($steps[]? | select(.id == $run.currentStepId)) as $current
    | if $current then "Step \($current.stepNumber): \($current.title) [\($current.status)]" else "No current step" end
  ' 2>/dev/null || echo "No current step")

  openclaw agent --agent main --message "ORCHESTRATOR QUEUE: Task \"${TASK_TITLE}\" (${TASK_ID}) is currently ${TASK_STATUS}. ${STEP_SUMMARY}. Review and continue orchestration if action is still required."
else
  echo "No actionable tasks found."
fi
