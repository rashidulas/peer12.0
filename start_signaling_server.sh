#!/bin/bash

# Start P2P Signaling Server
echo "🚀 Starting P2P Signaling Server..."
echo "📍 Server will run on: ws://localhost:8765"
echo "🔗 This helps peers discover each other for WebRTC connections"
echo ""

# Check if websockets is installed
if ! python3 -c "import websockets" 2>/dev/null; then
    echo "❌ websockets not found. Installing..."
    pip3 install websockets
fi

# Start the signaling server
cd /Users/atiqur/Projects/peer12.0
python3 backend/signaling_server.py
