import os, datetime as dt
from fastapi import FastAPI, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import asyncio

# Import both systems
from backend.telemetry import collect_metrics
from backend.ai_agent import analyze_logs
from livekit import api

load_dotenv()

# Environment variables
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

app = FastAPI(title="NetAgent Unified API")

# CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Unified NetAgent API is running"}

# ---- AI Insight ----
@app.post("/telemetry")
def post_telemetry(data: dict):
    collect_metrics(data)
    return {"status": "Telemetry received", "data": data}

@app.get("/predict")
def predict():
    try:
        insight = analyze_logs()
        return {"insight": insight}
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        return {"error": str(e), "traceback": tb}


# ---- LiveKit Token ----
@app.get("/token")
def token(identity: str = Query(...), room: str = "netagent-room"):
    # Build the token using helpers to avoid any field misnaming
    tok = (
        api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(identity)                       # -> "sub"
        .with_ttl(dt.timedelta(hours=6))
        .with_grants(
            api.VideoGrants(
                room_join=True,                        # must be True
                room=room,                             # room baked into JWT
                room_create=True,                      # TEMP: ease first join; remove later
                # can_publish=True, can_subscribe=True # defaults OK, but you can uncomment
            )
        )
    )

    jwt = tok.to_jwt()
    print(f"Issued token for {identity} / room={room} / url={LIVEKIT_URL}")
    return {"token": jwt, "room": room, "url": LIVEKIT_URL}


# ---- Agent Feed WebSocket ----
@app.websocket("/ws/agent-feed")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    for i in range(10):
        await websocket.send_text(f"Agent heartbeat #{i}")
        await asyncio.sleep(2)
    await websocket.close()
