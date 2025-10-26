#!/bin/bash

# NetAgent Demo Trigger Script
# This script helps you trigger different scenarios during your demo

echo "🎬 NetAgent Incident Response Demo"
echo "=================================="
echo ""

# Check if backend is running
if ! curl -s http://127.0.0.1:8000/health > /dev/null 2>&1; then
    echo " Backend is not running!"
    echo "Please start it first:"
    echo "   cd /Users/atiqur/Projects/peer12.0"
    echo "   uvicorn backend.main:app --reload"
    exit 1
fi

echo "Select a demo scenario:"
echo ""
echo "1. High Latency Alert (Main Hacking Space)"
echo "2. High Packet Loss Alert (Registration)"
echo "3. Complete Network Outage (Multiple Zones)"
echo "4. Custom Alert Message"
echo "5. Send Real Telemetry Data"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "Triggering: High Latency Alert..."
        curl -X POST "http://127.0.0.1:8000/actions/send-alert?message=High%20latency%20detected%20in%20Main%20Hacking%20Space%20-%20450ms%20average" | jq '.result.summary'
        ;;
    2)
        echo ""
        echo "Triggering: High Packet Loss Alert..."
        curl -X POST "http://127.0.0.1:8000/actions/send-alert?message=High%20packet%20loss%20detected%20in%20Registration%20area%20-%208%25%20loss" | jq '.result.summary'
        ;;
    3)
        echo ""
        echo "Triggering: Network Outage..."
        curl -X POST "http://127.0.0.1:8000/actions/send-alert?message=Critical:%20Network%20outage%20detected%20across%20multiple%20zones" | jq '.result.summary'
        ;;
    4)
        echo ""
        read -p "Enter your alert message: " message
        echo ""
        echo "Triggering: Custom Alert..."
        encoded_message=$(echo "$message" | jq -sRr @uri)
        curl -X POST "http://127.0.0.1:8000/actions/send-alert?message=$encoded_message" | jq '.result.summary'
        ;;
    5)
        echo ""
        echo "Sending Real Telemetry Data..."
        curl -X POST http://127.0.0.1:8000/telemetry \
          -H "Content-Type: application/json" \
          -d '{
            "deviceId": "demo-device-main",
            "latency": 450,
            "packetLoss": 0.08,
            "location": "Main Hacking Space",
            "ssid": "Hackathon-AP1",
            "bssid": "00:11:22:33:44:01",
            "agent": "demo-agent"
          }' | jq '.'
        echo ""
        echo "⏱ Auto-alert will trigger if thresholds exceeded..."
        ;;
    *)
        echo "Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo " Demo trigger complete!"
echo ""
echo " Check your Gmail inbox"
echo " Check your Jira board: https://calhacks-demo.atlassian.net/jira/your-view/projects/KAN/board"
echo " Check your Slack channel: #connectivity-alerts"
echo ""
echo " Ready for the next demo!"

