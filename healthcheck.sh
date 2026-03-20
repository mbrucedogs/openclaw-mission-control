#!/bin/zsh
PORT=4000
PIDFILE=/tmp/mission-control.pid
PROJECT_DIR="/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control"
LOGFILE="$PROJECT_DIR/logs/cron-healthcheck.log"
API_URL="http://localhost:$PORT"

# Check if Mission Control is healthy
if curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health" 2>/dev/null | grep -q "200\|401"; then
  # Service is up - send heartbeat to activity API
  HEARTBEAT_PAYLOAD=$(cat << 'PAYLOAD'
{
  "runId": "tron",
  "stepId": "tron-healthcheck",
  "taskId": "system",
  "agentId": "tron",
  "agentName": "Tron",
  "message": "healthcheck heartbeat",
  "metadata": {},
  "eventType": "heartbeat"
}
PAYLOAD
)
  curl -s -X POST "$API_URL/api/activity/heartbeat" \
    -H "Content-Type: application/json" \
    -d "$HEARTBEAT_PAYLOAD" >> "$LOGFILE" 2>&1
  exit 0
fi

# Service is down - restart it
EXISTING_PID=$(lsof -t -i :$PORT 2>/dev/null)
if [ -n "$EXISTING_PID" ]; then kill $EXISTING_PID 2>/dev/null; sleep 2; fi
cd $PROJECT_DIR && export PATH="/opt/homebrew/bin:$PATH" && nohup ./node_modules/.bin/next dev -p $PORT >> logs/stdout.log 2>> logs/stderr.log & echo $! > $PIDFILE
