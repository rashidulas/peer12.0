import json
import os
from datetime import datetime

def collect_metrics(data):
    record = {
        "deviceId": data.get("deviceId"),
        "latency": data.get("latency"),
        "packetLoss": data.get("packetLoss"),
        "timestamp": datetime.utcnow().isoformat()
    }
    # Persist logs inside the backend folder so readers use a consistent path
    log_path = os.path.join(os.path.dirname(__file__), "telemetry_log.json")
    with open(log_path, "a") as f:
        f.write(json.dumps(record) + "\n")
