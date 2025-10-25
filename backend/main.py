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
    try:
        # Fallback: some SDK versions expose classes at top-level
        import livekit as livekit_api  # type: ignore
        logger.info("LiveKit SDK imported successfully (livekit)")
    except Exception as e2:
        livekit_api = None
        LIVEKIT_IMPORT_ERROR = f"{e1}; fallback: {e2}"
        logger.error(f"LiveKit SDK import failed: {LIVEKIT_IMPORT_ERROR}")

# Optional Composio import (automation layer)
try:
    from composio import Composio
    logger.info("Composio SDK imported successfully")
except Exception as e:
    Composio = None
    logger.warning(f"Composio SDK import failed: {e}")

load_dotenv()

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
COMPOSIO_API_KEY = os.getenv("COMPOSIO_API_KEY")
COMPOSIO_ENTITY_ID = os.getenv("COMPOSIO_ENTITY_ID", "netagent-default")
ALERT_EMAIL_TO = os.getenv("ALERT_EMAIL_TO")

# === Caching & Rate Limiting ===
prediction_cache = {
    "data": None,
    "timestamp": 0,
    "ttl": 30  # Cache Claude predictions for 30 seconds
}

alert_state = {
    "last_alert_time": 0,
    "cooldown": 300,  # 5 minutes between alerts
    "is_alerting": False  # Track if we're in alert state
}

# Log configuration status on startup
logger.info("=" * 60)
logger.info("NetAgent Backend Starting")
logger.info("=" * 60)
logger.info(f"LiveKit URL: {LIVEKIT_URL if LIVEKIT_URL else 'NOT SET'}")
logger.info(f"LiveKit API Key: {'SET' if LIVEKIT_API_KEY else 'NOT SET'}")
logger.info(f"LiveKit API Secret: {'SET' if LIVEKIT_API_SECRET else 'NOT SET'}")
logger.info(f"Anthropic API Key: {'SET' if ANTHROPIC_API_KEY else 'NOT SET'}")
logger.info(f"Composio API Key: {'SET' if COMPOSIO_API_KEY else 'NOT SET'}")
logger.info("=" * 60)

app = FastAPI(title="NetAgent API")

@app.get("/")
def home():
    return {"message": "NetAgent API is running"}

@app.get("/health")
def health_check():
    """Comprehensive health check for all integrations"""
    logger.info("Health check requested")
    
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
        if LIVEKIT_IMPORT_ERROR:
            livekit_status["import_error"] = LIVEKIT_IMPORT_ERROR
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
    
    # Composio status
    composio_status = {
        "api_key_configured": bool(COMPOSIO_API_KEY),
        "sdk_installed": Composio is not None,
        "status": "healthy" if (COMPOSIO_API_KEY and Composio is not None) else (
            "not_configured" if not COMPOSIO_API_KEY else "sdk_missing"
        ),
    }
    health["services"]["composio"] = composio_status

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
        current_time = time.time()
        
        # Check cache: return cached data if still valid
        if (prediction_cache["data"] is not None and 
            current_time - prediction_cache["timestamp"] < prediction_cache["ttl"]):
            logger.info(f"Returning cached prediction (age: {int(current_time - prediction_cache['timestamp'])}s)")
            return {"insight": prediction_cache["data"]}
        
        # Cache expired, generate new prediction
        logger.info("AI prediction requested (cache miss)")
        insight = analyze_logs()
        logger.info(f"AI prediction generated: avg_latency={insight.get('avg_latency_ms')}ms")
        
        # Auto-alert: Check if network conditions are bad
        alert_triggered = False
        alert_reason = None
        
        avg_latency = insight.get('avg_latency_ms', 0)
        avg_loss = insight.get('avg_packet_loss', 0)
        
        # Define thresholds
        CRITICAL_LATENCY = 200  # ms
        CRITICAL_LOSS = 0.1     # 10%
        
        # Check if alert should be triggered
        if avg_latency > CRITICAL_LATENCY:
            alert_reason = f"High latency detected: {avg_latency:.1f}ms (threshold: {CRITICAL_LATENCY}ms)"
            alert_triggered = True
        elif avg_loss > CRITICAL_LOSS:
            alert_reason = f"High packet loss detected: {avg_loss*100:.1f}% (threshold: {CRITICAL_LOSS*100}%)"
            alert_triggered = True
        
        # Rate-limited alert logic
        if alert_triggered and ALERT_EMAIL_TO and Composio and COMPOSIO_API_KEY:
            # Check cooldown: only send if enough time has passed since last alert
            time_since_last_alert = current_time - alert_state["last_alert_time"]
            
            if time_since_last_alert >= alert_state["cooldown"]:
                # Send alert
                try:
                    logger.warning(f"Auto-alert triggered: {alert_reason} (last alert: {int(time_since_last_alert)}s ago)")
                    composio_client = Composio(api_key=COMPOSIO_API_KEY)
                    
                    alert_body = f"""NetAgent Auto-Alert

Network Issue Detected:
{alert_reason}

Current Metrics:
- Average Latency: {avg_latency:.1f}ms
- Average Packet Loss: {avg_loss*100:.1f}%

AI Recommendation:
{insight.get('claude_recommendation', 'N/A')}

Timestamp: {dt.datetime.utcnow().isoformat()}Z
"""
                    
                    result = composio_client.tools.execute(
                        slug="GMAIL_SEND_EMAIL",
                        arguments={
                            "recipient_email": ALERT_EMAIL_TO,
                            "subject": f"NetAgent Auto-Alert: {alert_reason.split(':')[0]}",
                            "body": alert_body,
                        },
                        user_id=COMPOSIO_ENTITY_ID,
                        dangerously_skip_version_check=True
                    )
                    
                    logger.info(f"Auto-alert email sent to {ALERT_EMAIL_TO}")
                    alert_state["last_alert_time"] = current_time
                    alert_state["is_alerting"] = True
                    insight['alert_sent'] = True
                    insight['alert_reason'] = alert_reason
                except Exception as e:
                    logger.error(f"Auto-alert email failed: {e}")
                    insight['alert_sent'] = False
                    insight['alert_error'] = str(e)
            else:
                # Cooldown active, skip sending
                cooldown_remaining = int(alert_state["cooldown"] - time_since_last_alert)
                logger.info(f"Alert suppressed (cooldown: {cooldown_remaining}s remaining)")
                insight['alert_sent'] = False
                insight['alert_reason'] = alert_reason
                insight['alert_suppressed'] = True
                insight['cooldown_remaining'] = cooldown_remaining
        else:
            insight['alert_sent'] = False
            if alert_triggered:
                insight['alert_reason'] = alert_reason + " (email not configured)"
            
            # Reset alert state if conditions are good
            if not alert_triggered and alert_state["is_alerting"]:
                logger.info("Network conditions recovered")
                alert_state["is_alerting"] = False
        
        # Update cache
        prediction_cache["data"] = insight
        prediction_cache["timestamp"] = current_time
        
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


# ---- Composio Simple Actions ----
@app.post("/actions/speedtest")
def run_speed_test():
    """Run a local speed test using speedtest-cli and return results."""
    try:
        # Run speedtest-cli with JSON output
        result = subprocess.run(
            ["speedtest-cli", "--json"], capture_output=True, text=True, timeout=120
        )
        if result.returncode != 0:
            return {"error": "speedtest-cli failed", "stderr": result.stderr.strip()}

        data = json.loads(result.stdout)
        # Normalize units (bits/s to Mbps, ms already)
        down_mbps = round((data.get("download", 0) / 1_000_000), 2)
        up_mbps = round((data.get("upload", 0) / 1_000_000), 2)
        ping_ms = round(data.get("ping", 0), 2)

        return {
            "status": "ok",
            "download_mbps": down_mbps,
            "upload_mbps": up_mbps,
            "ping_ms": ping_ms,
            "server": data.get("server", {}),
            "timestamp": data.get("timestamp"),
        }
    except FileNotFoundError:
        return {
            "error": "speedtest-cli not found",
            "hint": "pip install speedtest-cli (already in requirements) and restart backend",
        }
    except subprocess.TimeoutExpired:
        return {"error": "speedtest timed out"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/actions/save-logs")
def save_logs():
    if Composio is None or not COMPOSIO_API_KEY:
        return {"error": "Composio not configured"}
    try:
        return {"status": "queued", "action": "save_logs"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/actions/send-alert")
def send_alert(message: str = Query("Network degradation detected")):
    """Send email alert via Gmail using Composio."""
    if Composio is None or not COMPOSIO_API_KEY:
        return {"error": "Composio not configured"}
    
    if not ALERT_EMAIL_TO:
        return {"error": "ALERT_EMAIL_TO not set in .env"}
    
    try:
        # Initialize Composio client
        composio_client = Composio(api_key=COMPOSIO_API_KEY)
        
        # Execute Gmail send email action with entity (user) context
        result = composio_client.tools.execute(
            slug="GMAIL_SEND_EMAIL",
            arguments={
                "recipient_email": ALERT_EMAIL_TO,
                "subject": "NetAgent Alert: Network Issue Detected",
                "body": f"NetAgent has detected a network issue:\n\n{message}\n\nTimestamp: {dt.datetime.utcnow().isoformat()}Z",
            },
            user_id=COMPOSIO_ENTITY_ID,
            dangerously_skip_version_check=True
        )
        
        logger.info(f"Gmail alert sent to {ALERT_EMAIL_TO}: {message}")
        return {
            "status": "sent",
            "action": "send_alert",
            "message": message,
            "to": ALERT_EMAIL_TO,
            "result": str(result)
        }
    except Exception as e:
        logger.error(f"Gmail alert failed: {e}")
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # your Next.js URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)