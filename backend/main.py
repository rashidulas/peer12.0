from fastapi import FastAPI
from backend.telemetry import collect_metrics
from backend.ai_agent import analyze_logs
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="NetAgent API")

@app.get("/")
def home():
    return {"message": "NetAgent API is running"}

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # your Next.js URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)