#!/bin/bash
# iFlow CLI ACP Mode Launcher for Obsidian
# This script ensures iFlow CLI is running in ACP mode on port 8090

set -e

PORT=8090
COMMAND="iflow --experimental-acp --port $PORT --stream"

echo "🔍 Checking if iFlow CLI is already running on port $PORT..."

if lsof -i :$PORT > /dev/null 2>&1; then
    echo "✅ iFlow CLI is already running on port $PORT"
    echo "   WebSocket: ws://localhost:$PORT/acp"
    echo ""
    echo "To restart, first run:"
    echo "  lsof -ti:$PORT | xargs kill -9"
    exit 0
fi

echo "🚀 Starting iFlow CLI in ACP mode..."
echo "   Command: $COMMAND"
echo ""

# Start iFlow CLI in ACP mode
$COMMAND &
IFLOW_PID=$!

# Wait for the server to start
echo "⏳ Waiting for server to start..."
sleep 3

# Check if the port is now listening
if lsof -i :$PORT > /dev/null 2>&1; then
    echo ""
    echo "✅ iFlow ACP Server started successfully!"
    echo "   WebSocket: ws://localhost:$PORT/acp"
    echo "   PID: $IFLOW_PID"
    echo ""
    echo "You can now use iFlow in Obsidian."
else
    echo ""
    echo "❌ Failed to start iFlow CLI. Check the logs above."
    exit 1
fi
