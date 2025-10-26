#!/bin/bash

# Test script for venue heatmap with different locations
echo "🏢 Testing Venue Heatmap with Different Locations"
echo "=================================================="

# Base URL
BASE_URL="http://localhost:8000"

# Test locations with predefined coordinates
declare -A LOCATIONS=(
    ["Main Hacking Space"]="50,50"
    ["Registration"]="20,20" 
    ["Theater"]="80,30"
    ["Hearst Room"]="55,10"
    ["Drink & Snack Bar"]="15,15"
)

# Function to send telemetry data
send_telemetry() {
    local device_id=$1
    local location=$2
    local latency=$3
    local packet_loss=$4
    local ssid=$5
    
    echo "📡 Sending telemetry for $location..."
    
    curl -X POST "$BASE_URL/telemetry" \
        -H "Content-Type: application/json" \
        -d "{
            \"deviceId\": \"$device_id\",
            \"latencyMs\": $latency,
            \"packetLoss\": $packet_loss,
            \"location\": \"$location\",
            \"ssid\": \"$ssid\",
            \"bssid\": \"00:11:22:33:44:$(printf '%02d' $((RANDOM % 100)))\"
        }" \
        -s > /dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully sent data for $location"
    else
        echo "❌ Failed to send data for $location"
    fi
}

# Test 1: Send data for all predefined locations
echo ""
echo "🧪 Test 1: Sending data for all predefined locations"
echo "----------------------------------------------------"

counter=1
for location in "${!LOCATIONS[@]}"; do
    # Generate random but realistic network metrics
    latency=$((20 + RANDOM % 100))  # 20-120ms
    packet_loss=$(echo "scale=3; $RANDOM/32767*0.05" | bc)  # 0-5%
    
    send_telemetry "device-$counter" "$location" "$latency" "$packet_loss" "Hackathon-AP$counter"
    ((counter++))
    sleep 1
done

echo ""
echo "🎯 Check your dashboard at http://localhost:3000/dashboard (Health tab)"
echo "   You should see WiFi icons at the predefined room coordinates!"

# Test 2: Simulate network issues
echo ""
echo "🧪 Test 2: Simulating network issues"
echo "------------------------------------"

# Send high latency data for Theater
send_telemetry "device-theater-issue" "Theater" "500" "0.15" "Hackathon-AP-ISSUE"
echo "   Theater should show red/orange WiFi icon (high latency)"

# Send high packet loss for Registration
send_telemetry "device-reg-issue" "Registration" "200" "0.25" "Hackathon-AP-ISSUE"
echo "   Registration should show red WiFi icon (high packet loss)"

# Test 3: Send data for unknown location (should use fallback positioning)
echo ""
echo "🧪 Test 3: Testing unknown location (fallback positioning)"
echo "----------------------------------------------------------"

send_telemetry "device-unknown" "Unknown Room" "80" "0.02" "Hackathon-AP-UNKNOWN"
echo "   Unknown Room should appear at a random position on the map"

echo ""
echo "🎉 Testing complete!"
echo ""
echo "📋 What to check in your dashboard:"
echo "   1. WiFi icons should appear at room coordinates"
echo "   2. Colors should reflect network health (green=good, red=bad)"
echo "   3. Click icons to see detailed information"
echo "   4. Data should update every 5 seconds"
echo "   5. Unknown locations should use fallback positioning"
echo ""
echo "🔧 To test real-time updates, run this script multiple times:"
echo "   ./test_venue_locations.sh"
