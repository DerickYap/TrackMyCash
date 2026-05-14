#!/bin/bash
# Track My Cash launcher — double-click from Finder to start the app.

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=3001
URL="http://localhost:$PORT"

# Binaries — called directly to avoid npm EPERM issues on macOS
VITE="$REPO/frontend/node_modules/.bin/vite"
TS_NODE="$REPO/backend/node_modules/.bin/ts-node"

# Strip macOS quarantine flags that npm sets on downloaded packages.
# Finder-launched Terminal enforces stricter Gatekeeper rules, which blocks
# Node.js from reading quarantined node_modules files with EPERM.
xattr -rd com.apple.quarantine "$REPO" 2>/dev/null || true

# Kill any existing instance on this port
lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
sleep 0.5

# Build frontend if dist is missing (first run, or after deleting dist to force a rebuild)
if [ ! -f "$REPO/frontend/dist/index.html" ]; then
  echo "Building frontend..."
  cd "$REPO/frontend" && "$VITE" build
  if [ ! -f "$REPO/frontend/dist/index.html" ]; then
    echo ""
    echo "ERROR: Frontend build failed."
    echo "Open a terminal in the project folder and run: npm run build --workspace=frontend"
    read -rp "Press Enter to exit..." && exit 1
  fi
fi

# Start the backend via ts-node (compiles in memory — no dist/ file needed)
echo "Starting Track My Cash..."
cd "$REPO"
NODE_ENV=production "$TS_NODE" "$REPO/backend/src/index.ts" &
SERVER_PID=$!

# Wait until the server is ready (up to 15 seconds)
for i in $(seq 1 30); do
  curl -s "$URL/health" > /dev/null 2>&1 && break
  sleep 0.5
done

open "$URL"

echo ""
echo "  Track My Cash → $URL"
echo "  Close this window to stop the server."
echo ""

trap "kill $SERVER_PID 2>/dev/null" EXIT
wait $SERVER_PID
