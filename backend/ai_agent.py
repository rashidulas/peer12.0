import os, json
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def analyze_logs():
    log_file = os.path.join(os.path.dirname(__file__), "telemetry_log.json")

    if not os.path.exists(log_file):
        return {"error": "No telemetry data yet. Please run the client first."}

    with open(log_file, "r") as f:
        lines = [line.strip() for line in f.readlines() if line.strip()]

    if not lines:
        return {"error": "No telemetry entries found."}

    try:
        records = [json.loads(line) for line in lines[-20:]]
    except Exception as e:
        return {"error": f"Error parsing telemetry: {e}"}

    valid = [r for r in records if r["latency"] < 9000]
    avg_latency = sum(r["latency"] for r in valid) / len(valid) if valid else 9999
    avg_loss = sum(r["packetLoss"] for r in records) / len(records)

    prompt = f"""
    You are NetAgent analyzing real network telemetry.
    Average latency: {avg_latency:.2f} ms
    Average packet loss: {avg_loss:.2f}
    Predict if a connection drop is likely and give a one-sentence recommendation.
    """

    msg = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )

    return {
        "avg_latency_ms": round(avg_latency, 2),
        "avg_packet_loss": round(avg_loss, 2),
        "claude_recommendation": msg.content[0].text.strip()
    }
