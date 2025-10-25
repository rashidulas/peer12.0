import json
from datetime import datetime

def collect_metrics(data):
    record = {
        "deviceId": data.get("deviceId"),
        "latency": data.get("latency"),
        "packetLoss": data.get("packetLoss"),
        "timestamp": datetime.utcnow().isoformat()
    }
    with open("telemetry_log.json", "a") as f:
        f.write(json.dumps(record) + "\n")
