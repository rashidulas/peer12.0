# Backend Setup Guide

## Prerequisites

- Python 3.11 or higher
- pip (Python package manager)
- Anthropic API key
- LiveKit Cloud account

## Installation

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```bash
# Anthropic API Key
# Get from: https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=sk-ant-your_key_here

# LiveKit Credentials
# Get from: https://cloud.livekit.io/projects/your-project/settings
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
```

### 3. Start the Server

```bash
uvicorn backend.main:app --reload
```

Expected output:

```
============================================================
NetAgent Backend Starting
============================================================
LiveKit URL: wss://your-project.livekit.cloud
LiveKit API Key: SET
LiveKit API Secret: SET
Anthropic API Key: SET
============================================================
INFO:     Uvicorn running on http://127.0.0.1:8000
```

## Verify Installation

### Test Health Endpoint

```bash
curl http://127.0.0.1:8000/health | jq
```

Should return all services with "healthy" status.

### Test LiveKit Token Generation

```bash
curl "http://127.0.0.1:8000/token?identity=test-user" | jq
```

Should return a JWT token, room name, and LiveKit URL.

### Test AI Prediction (requires telemetry data)

```bash
curl http://127.0.0.1:8000/predict | jq
```

## API Endpoints

### REST Endpoints

- `GET /` - API health check
- `GET /health` - Detailed service status
- `POST /telemetry` - Submit network metrics
- `GET /predict` - Get AI analysis of network logs
- `GET /token?identity=<user>` - Generate LiveKit access token

### WebSocket Endpoints

- `WS /ws/agent-feed` - Real-time agent activity stream

## Dependencies

Key packages in `requirements.txt`:

- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `anthropic` - Claude AI client
- `livekit` - LiveKit server SDK
- `python-dotenv` - Environment variable management
- `ping3` - Network ping utility (for client.py)

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>
```

### Environment Variables Not Loading

- Ensure `.env` file is in the `backend/` directory
- Restart the server after changing `.env`
- Check for typos in variable names

### LiveKit Token Generation Fails

- Verify all three LiveKit variables are set correctly
- Check API key and secret have no extra spaces
- Confirm URL format: `wss://project-name.livekit.cloud`

### Anthropic API Errors

- Verify API key is valid and active
- Check API key has proper permissions
- Ensure no rate limiting issues

### Telemetry Log Missing

- The log file (`telemetry_log.json`) is created automatically on first POST to `/telemetry`
- Run `python3 client.py` to generate sample data
- Check write permissions in `backend/` directory

## Development

### Running with Auto-reload

```bash
uvicorn backend.main:app --reload
```

The `--reload` flag automatically restarts the server when code changes are detected.

### Logging

Backend uses Python's logging module. Check console output for:

- Startup configuration status
- Request handling logs
- Error messages with tracebacks

### Testing Telemetry Collection

```bash
# Send sample telemetry
curl -X POST http://127.0.0.1:8000/telemetry \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device","latency":45.2,"packetLoss":0.02}'
```

Check `backend/telemetry_log.json` for the logged entry.

## Production Considerations

For production deployment:

1. Use proper ASGI server (gunicorn + uvicorn workers)
2. Set up environment variables via system/container config
3. Configure CORS for your frontend domain
4. Enable HTTPS/WSS
5. Add rate limiting and authentication
6. Monitor LiveKit usage and quotas
7. Set up proper logging and error tracking

## Support

For issues:

1. Check backend console logs for errors
2. Verify all environment variables are set
3. Test individual endpoints with curl
4. Check `/health` endpoint for service status
