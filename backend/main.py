import os
import datetime as dt
import asyncio
import logging
from fastapi import FastAPI, WebSocket, Query
from backend.telemetry import collect_metrics
from backend.ai_agent import analyze_logs
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("NetAgent")

try:
    from livekit import api as livekit_api
    logger.info("✅ LiveKit SDK imported successfully")
except Exception as e:
    livekit_api = None
    logger.error(f"❌ LiveKit SDK import failed: {e}")

load_dotenv()

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# Log configuration status on startup
logger.info("=" * 60)
logger.info("NetAgent Backend Starting")
logger.info("=" * 60)
logger.info(f"LiveKit URL: {LIVEKIT_URL if LIVEKIT_URL else 'NOT SET'}")
logger.info(f"LiveKit API Key: {'SET' if LIVEKIT_API_KEY else 'NOT SET'}")
logger.info(f"LiveKit API Secret: {'SET' if LIVEKIT_API_SECRET else 'NOT SET'}")
logger.info(f"Anthropic API Key: {'SET' if ANTHROPIC_API_KEY else 'NOT SET'}")
logger.info("=" * 60)

app = FastAPI(title="NetAgent API")

@app.get("/")
def home():
    return {"message": "NetAgent API is running"}

@app.get("/health")
def health_check():
    """Comprehensive health check for all integrations"""
    logger.info("🏥 Health check requested")
    
    health = {
        "status": "healthy",
        "timestamp": dt.datetime.utcnow().isoformat(),
        "services": {}
    }
    
    # Check LiveKit
    livekit_status = {
        "sdk_installed": livekit_api is not None,
        "url_configured": bool(LIVEKIT_URL),
        "credentials_configured": bool(LIVEKIT_API_KEY and LIVEKIT_API_SECRET),
        "url": LIVEKIT_URL if LIVEKIT_URL else None,
    }
    
    if livekit_api and all([LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET]):
        try:
            # Test token generation
            test_token = (
                livekit_api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
                .with_identity("health-check")
                .with_ttl(dt.timedelta(minutes=1))
                .with_grants(livekit_api.VideoGrants(room_join=True, room="health-check"))
            )
            test_token.to_jwt()
            livekit_status["token_generation"] = "working"
            livekit_status["status"] = "healthy"
            logger.info("LiveKit: Token generation successful")
        except Exception as e:
            livekit_status["token_generation"] = f"failed: {str(e)}"
            livekit_status["status"] = "unhealthy"
            logger.error(f"LiveKit: Token generation failed - {e}")
            health["status"] = "degraded"
    else:
        livekit_status["status"] = "not_configured"
        logger.warning("LiveKit: Not fully configured")
    
    health["services"]["livekit"] = livekit_status
    
    # Check Anthropic
    anthropic_status = {
        "api_key_configured": bool(ANTHROPIC_API_KEY),
        "status": "healthy" if ANTHROPIC_API_KEY else "not_configured"
    }
    health["services"]["anthropic"] = anthropic_status
    
    # Check telemetry
    telemetry_log = os.path.join(os.path.dirname(__file__), "telemetry_log.json")
    telemetry_status = {
        "log_file_exists": os.path.exists(telemetry_log),
        "status": "healthy" if os.path.exists(telemetry_log) else "no_data_yet"
    }
    if os.path.exists(telemetry_log):
        telemetry_status["log_size_bytes"] = os.path.getsize(telemetry_log)
    health["services"]["telemetry"] = telemetry_status
    
    logger.info(f"Health check complete: {health['status']}")
    return health

@app.post("/telemetry")
def post_telemetry(data: dict):
    try:
        collect_metrics(data)
        logger.debug(f"Telemetry received: {data.get('agent', 'unknown')} - {data.get('latency')}ms")
        return {"status": "Telemetry received", "data": data}
    except Exception as e:
        logger.error(f"Error collecting telemetry: {e}")
        return {"status": "error", "error": str(e)}

@app.get("/predict")
def predict():
    try:
        logger.info("AI prediction requested")
        insight = analyze_logs()
        logger.info(f"AI prediction generated: avg_latency={insight.get('avg_latency_ms')}ms")
        return {"insight": insight}
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"AI prediction failed: {e}\n{tb}")
        return {"error": str(e), "traceback": tb}


# ---- LiveKit Token (mirrors backend/app.py) ----
@app.get("/token")
def token(identity: str = Query(...), room: str = "netagent-room"):
    if livekit_api is None:
        return {"error": "LiveKit SDK not installed on server"}

    if not all([LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL]):
        missing = []
        if not LIVEKIT_URL: missing.append("LIVEKIT_URL")
        if not LIVEKIT_API_KEY: missing.append("LIVEKIT_API_KEY")
        if not LIVEKIT_API_SECRET: missing.append("LIVEKIT_API_SECRET")
        return {"error": f"Missing LiveKit credentials: {', '.join(missing)}"}

    try:
        tok = (
            livekit_api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
            .with_identity(identity)
            .with_ttl(dt.timedelta(hours=6))
            .with_grants(
                livekit_api.VideoGrants(
                    room_join=True,
                    room=room,
                    room_create=True,
                )
            )
        )

        jwt = tok.to_jwt()
        logger.info(f"Generated LiveKit token for {identity} - room={room}")
        return {"token": jwt, "room": room, "url": LIVEKIT_URL}
    except Exception as e:
        logger.error(f"LiveKit token generation failed: {e}")
        return {"error": f"Token generation failed: {str(e)}"}


# ---- Agent Feed WebSocket (simple heartbeat stream) ----
@app.websocket("/ws/agent-feed")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected to agent-feed")
    counter = 0
    try:
        while True:
            await websocket.send_text(f"Agent heartbeat #{counter}")
            counter += 1
            await asyncio.sleep(2)
    except Exception as e:
        logger.info(f"WebSocket client disconnected: {e}")
        pass

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # your Next.js URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)