#!/bin/zsh
# Mission Control startup wrapper for launchd

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec >>"$SCRIPT_DIR/logs/launchd-debug.log" 2>&1
set -x

echo "=== Starting Mission Control at $(date) ==="
echo "Current directory: $(pwd)"
echo "PATH: $PATH"
echo "HOME: $HOME"
echo "Shell: $SHELL"

cd "$SCRIPT_DIR" || {
    echo "Failed to cd to project directory: $SCRIPT_DIR"
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
