#!/bin/bash
# Track My Cash launcher — double-click from Finder to start the app.

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=3001
URL="http://localhost:$PORT"

# Binaries (called directly to avoid npm EPERM issues on macOS)
TSC="$REPO/node_modules/.bin/tsc"
VITE="$REPO/frontend/node_modules/.bin/vite"

# Kill any existing instance on this port
lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
sleep 0.5

# Build frontend if dist is missing (first run, or after deleting dist to force rebuild)
if [ ! -f "$REPO/frontend/dist/index.html" ]; then
  echo "Building frontend..."
  cd "$REPO/frontend" && "$VITE" build
  if [ ! -f "$REPO/frontend/dist/index.html" ]; then
    echo "ERROR: Frontend build failed. Open Terminal in the project folder and run:"
    echo "  npm run build --workspace=frontend"
    read -rp "Press Enter to exit..." && exit 1
  fi
fi

# Compile backend TypeScript
echo "Compiling backend..."
"$TSC" -p "$REPO/backend/tsconfig.json"
if [ ! -f "$REPO/backend/dist/index.js" ]; then
  echo "ERROR: Backend compile failed."
  read -rp "Press Enter to exit..." && exit 1
fi

# Start the server
echo "Starting Track My Cash..."
cd "$REPO"
NODE_ENV=production node "$REPO/backend/dist/index.js" &
SERVER_PID=$!

# Wait until the server is ready
for i in $(seq 1 20); do
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
