import os
import datetime as dt
import asyncio
import logging
from fastapi import FastAPI, WebSocket, Query
from backend.telemetry import collect_metrics
from backend.ai_agent import analyze_logs
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import subprocess
import json
import time
# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("NetAgent")

LIVEKIT_IMPORT_ERROR = None
try:
    # Preferred import style (older SDKs)
    from livekit import api as livekit_api
    logger.info("LiveKit SDK imported successfully (livekit.api)")
except Exception as e1:
	@@ -41,14 +41,6 @@
    Composio = None
    logger.warning(f"Composio SDK import failed: {e}")

# Optional Chroma import (vector store for heatmap)
try:
    from backend.chroma_service import chroma_store
    logger.info("Chroma service imported successfully")
except Exception as e:
    chroma_store = None
    logger.warning(f"Chroma service import failed: {e}")

load_dotenv()

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
	@@ -168,14 +160,6 @@ def health_check():
def post_telemetry(data: dict):
    try:
        collect_metrics(data)

        # Also store in Chroma for heatmap visualization
        if chroma_store:
            device_id = data.get('deviceId', data.get('agent', 'unknown'))
            latency = data.get('latency', 0)
            packet_loss = data.get('packetLoss', data.get('packet_loss', 0))
            chroma_store.add_telemetry(device_id, latency, packet_loss)

        logger.debug(f"Telemetry received: {data.get('agent', 'unknown')} - {data.get('latency')}ms")
        return {"status": "Telemetry received", "data": data}
    except Exception as e:
	@@ -411,52 +395,6 @@ def send_alert(message: str = Query("Network degradation detected")):
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}


# ---- Chroma Heatmap Endpoints ----
@app.get("/heatmap/zones")
def get_heatmap_zones(limit: int = 20):
    """Get network health zones for heatmap visualization"""
    if not chroma_store:
        return {"error": "Chroma not configured", "zones": []}

    try:
        zones = chroma_store.get_health_zones(num_zones=limit)
        stats = chroma_store.get_stats()

        logger.debug(f"Heatmap zones requested: {len(zones)} zones returned")
        return {
            "zones": zones,
            "stats": stats,
            "timestamp": dt.datetime.utcnow().isoformat()
        }
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"Heatmap zones failed: {e}\n{tb}")
        return {"error": str(e), "traceback": tb, "zones": []}

@app.get("/heatmap/similar")
def find_similar_zones(latency: float = 100, packet_loss: float = 0.01, limit: int = 5):
    """Find zones with similar network conditions"""
    if not chroma_store:
        return {"error": "Chroma not configured", "similar": []}

    try:
        similar = chroma_store.find_similar_conditions(latency, packet_loss, n_results=limit)

        logger.debug(f"Similar zones query: latency={latency}ms, loss={packet_loss*100}%")
        return {
            "query": {"latency": latency, "packet_loss": packet_loss},
            "similar": similar,
            "timestamp": dt.datetime.utcnow().isoformat()
        }
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"Similar zones query failed: {e}\n{tb}")
        return {"error": str(e), "traceback": tb, "similar": []}


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # your Next.js URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)