#!/bin/zsh
echo "Test script ran at $(date)" >> /tmp/mc-test.log
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/start-mission-control.sh"
