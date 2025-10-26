import time
import threading
import json
import uuid
import requests
from ping3 import ping

class NetAgent:
    def __init__(self, name, api_url="http://127.0.0.1:8000/telemetry", peers=None, location=None, ssid=None, bssid=None):
        self.name = name
        self.device_id = str(uuid.uuid4())
        self.api_url = api_url
        self.peers = peers or []
        self.running = True
        self.location = location
        self.ssid = ssid
        self.bssid = bssid

    def measure_network(self, target="8.8.8.8"):
        latency = ping(target, unit="ms")
        packet_loss = 0 if latency else 1
        return {
            "deviceId": self.device_id,
            "latency": latency or 9999,
            "packetLoss": packet_loss,
            "agent": self.name,
        }

    def send_telemetry(self):
        data = self.measure_network()
        # Add metadata for location and network info
        if self.location:
            data["location"] = self.location
        if self.ssid:
            data["ssid"] = self.ssid
        if self.bssid:
            data["bssid"] = self.bssid
        try:
            requests.post(self.api_url, json=data)
            print(f"[{self.name}] Sent telemetry → {data}")
        except Exception as e:
            print(f"[{self.name}] Error sending telemetry: {e}")

    def receive_message(self, msg):
        """Handle messages from peers"""
        print(f"[{self.name}] Received message: {msg}")

    def broadcast(self, msg):
        """Send message to peers"""
        for peer in self.peers:
            peer.receive_message(f"{self.name} says: {msg}")

    def monitor_loop(self):
        """Continuously collect data and coordinate with peers"""
        while self.running:
            data = self.measure_network()
            latency = data["latency"]
            self.send_telemetry()

            # simple coordination logic
            if latency > 300:
                alert = f"⚠️ High latency ({latency:.1f}ms)"
                self.broadcast(alert)

            time.sleep(5)

    def start(self):
        thread = threading.Thread(target=self.monitor_loop)
        thread.daemon = True
        thread.start()
        print(f"[{self.name}] Agent started with ID {self.device_id}")
