#!/bin/zsh
# Mission Control startup wrapper for launchd

exec >>/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/logs/launchd-debug.log 2>&1
set -x

echo "=== Starting Mission Control at $(date) ==="
echo "Current directory: $(pwd)"
echo "PATH: $PATH"
echo "HOME: $HOME"
echo "Shell: $SHELL"

cd /Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control || {
    echo "Failed to cd to project directory"
    exit 1
}

echo "Changed to: $(pwd)"

# Ensure logs directory exists
mkdir -p logs

# Export PATH to ensure npm/node are found
export PATH="/opt/homebrew/bin:$PATH"

which npm || echo "npm not found in PATH"
which node || echo "node not found in PATH"

# Start the dev server
echo "Starting npm run dev..."
exec npm run dev
