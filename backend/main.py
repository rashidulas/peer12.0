from fastapi import FastAPI
from backend.telemetry import collect_metrics
from backend.ai_agent import analyze_logs

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
