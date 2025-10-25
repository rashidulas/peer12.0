from fastapi import FastAPI
from telemetry import collect_metrics

app = FastAPI(title="NetAgent API")

@app.get("/")
def home():
    return {"message": "NetAgent API is running"}

@app.post("/telemetry")
def post_telemetry(data: dict):
    collect_metrics(data)
    return {"status": "Telemetry received", "data": data}
