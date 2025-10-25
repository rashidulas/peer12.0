from uagents import Agent, Context
from models import Telemetry, CongestionAlert
from ping3 import ping
import requests, uuid

# Unique Agent setup
agent = Agent(
    name="AlphaAgent",
    seed="alpha-seed",
    port=8001,  # ✅ unique port
    endpoint=["http://127.0.0.1:8001/submit"]
)

BACKEND_URL = "http://127.0.0.1:8000/telemetry"  # backend FastAPI
TARGET = "8.8.8.8"
DEVICE_ID = str(uuid.uuid4())

@agent.on_interval(period=5.0)
async def monitor(ctx: Context):
    """Ping network, log telemetry, broadcast congestion alerts."""
    latency = ping(TARGET, unit="ms")
    packet_loss = 0 if latency else 1
    data = {"deviceId": DEVICE_ID, "latency": latency or 9999, "packetLoss": packet_loss}

    # Send telemetry to backend
    try:
        requests.post(BACKEND_URL, json=data, timeout=3)
        ctx.logger.info(f"📡 Sent telemetry: {data}")
    except Exception as e:
        ctx.logger.error(f"Failed to post telemetry: {e}")

    # Broadcast alert if latency high
    if latency and latency > 300:
        alert = CongestionAlert(
            sender=DEVICE_ID,
            latency=latency,
            message="⚠️ High latency detected!"
        )
        await ctx.broadcast(alert, CongestionAlert)
        ctx.logger.warning(f"Broadcasted alert: {alert}")

@agent.on_message(model=CongestionAlert)
async def handle_alert(ctx: Context, sender: str, msg: CongestionAlert):
    """Respond to alerts from peers."""
    ctx.logger.info(f"📩 Received from {sender}: {msg.message} ({msg.latency:.1f} ms)")

if __name__ == "__main__":
    agent.run()
