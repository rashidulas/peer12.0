# agents/fetch_agents/models.py
from uagents import Model

class Telemetry(Model):
    device_id: str
    latency: float
    packet_loss: float

class CongestionAlert(Model):
    sender: str
    latency: float
    message: str

class AIInsight(Model):
    sender: str
    recommendation: str
