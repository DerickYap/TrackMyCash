#!/bin/bash
# Track My Cash launcher
# Double-click this file from Finder to start the app.

REPO="$(cd "$(dirname "$0")" && pwd)"
PORT=3001
URL="http://localhost:$PORT"

cd "$REPO"

# Kill any previous instance on the same port
lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
sleep 0.5

# Build frontend if dist is missing (first run or after pulling changes)
if [ ! -f "$REPO/frontend/dist/index.html" ]; then
  echo "Building frontend for the first time..."
  npm run build --workspace=frontend
fi

# Compile backend TypeScript → dist/
echo "Compiling backend..."
cd "$REPO/backend" && npm run build
cd "$REPO"

# Start the server
echo "Starting Track My Cash..."
NODE_ENV=production node "$REPO/backend/dist/index.js" &
SERVER_PID=$!

# Wait until the server responds
until curl -s "$URL/health" > /dev/null 2>&1; do sleep 0.5; done

# Open in default browser
open "$URL"

echo ""
echo "  Track My Cash → $URL"
echo "  Close this window to stop the server."
echo ""

# Stop the server when this terminal window is closed
trap "kill $SERVER_PID 2>/dev/null" EXIT
wait $SERVER_PID
