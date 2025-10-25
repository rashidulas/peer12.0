import requests
from ping3 import ping
import time
import uuid

# Unique ID for this device
DEVICE_ID = str(uuid.uuid4())

# Backend API endpoint
API_URL = "http://127.0.0.1:8000/telemetry"

# Target host to measure latency against
TARGET = "8.8.8.8"  # Google DNS

def measure_network():
    latency = ping(TARGET, unit='ms')
    packet_loss = 0 if latency else 1
    data = {
        "deviceId": DEVICE_ID,
        "latency": latency or 9999,
        "packetLoss": packet_loss
    }
    try:
        response = requests.post(API_URL, json=data)
        print(f"Sent: {data} | Response: {response.status_code}")
    except Exception as e:
        print(f"Error sending data: {e}")

if __name__ == "__main__":
    print(f"NetAgent Client started. Device ID: {DEVICE_ID}")
    while True:
        measure_network()
        time.sleep(5)  # Send every 5 seconds
