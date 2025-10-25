import os
import asyncio
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from livekit import api
from dotenv import load_dotenv

load_dotenv()

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

app = FastAPI(title="NetAgent P2P Server")

# Enable CORS for dashboard access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "NetAgent P2P server is live!"}


@app.get("/token")
async def get_token(identity: str = "guest"):
    try:
        if not all([LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET]):
            return {"error": "Missing LiveKit credentials"}

        # New token generation for LiveKit v1.0.7
        token = api.AccessToken(
            api_key=LIVEKIT_API_KEY,
            api_secret=LIVEKIT_API_SECRET,
        )
        token.identity = identity
        token.grants = api.VideoGrants(
            room_join=True,
            room="netagent-room"
        )

        jwt = token.to_jwt()
        return {"token": jwt, "room": "netagent-room"}

    except Exception as e:
        return {"error": str(e)}


@app.websocket("/ws/agent-feed")
async def agent_feed(websocket: WebSocket):
    await websocket.accept()
    try:
        counter = 0
        while True:
            await websocket.send_text(f"Agent heartbeat #{counter}")
            counter += 1
            await asyncio.sleep(5)
    except Exception:
        await websocket.close()
