#!/bin/zsh
# Mission Control health check and auto-restart script
# This runs via cron to ensure the service stays up

PORT=4000
PIDFILE=/tmp/mission-control.pid
LOGFILE=/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/logs/cron-healthcheck.log
PROJECT_DIR=/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control

echo "$(date): Health check starting..." >> $LOGFILE

# Check if port is responding
curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/health 2>/dev/null | grep -q "200\|401"
if [ $? -eq 0 ]; then
    echo "$(date): Service is healthy on port $PORT" >> $LOGFILE
    exit 0
fi

# Check if there's already a process running on that port
EXISTING_PID=$(lsof -t -i :$PORT 2>/dev/null)
if [ -n "$EXISTING_PID" ]; then
    echo "$(date): Killing stale process $EXISTING_PID" >> $LOGFILE
    kill $EXISTING_PID 2>/dev/null
    sleep 2
fi

# Start the service
echo "$(date): Starting Mission Control..." >> $LOGFILE
cd $PROJECT_DIR
export PATH="/opt/homebrew/bin:$PATH"
nohup npm run dev >> logs/stdout.log 2>> logs/stderr.log &
echo $! > $PIDFILE

echo "$(date): Started with PID $(cat $PIDFILE)" >> $LOGFILE
