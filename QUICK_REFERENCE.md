# NetAgent Quick Reference

## Startup Commands

### Backend

```bash
cd backend
uvicorn backend.main:app --reload
```

### Dashboard

```bash
cd dashboard
npm run dev
```

### Telemetry Client (Optional)

```bash
python3 client.py
```

---

## Key Endpoints

```bash
# Health check - shows all service status
curl http://127.0.0.1:8000/health | jq

# Get AI analysis of network logs
curl http://127.0.0.1:8000/predict | jq

# Generate LiveKit token for P2P mesh
curl "http://127.0.0.1:8000/token?identity=test-user" | jq

# Send test telemetry
curl -X POST http://127.0.0.1:8000/telemetry \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test","latency":50,"packetLoss":0}'
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check if port 8000 is in use
lsof -i :8000

# Verify dependencies
cd backend
pip install -r requirements.txt

# Check .env file exists
ls -la .env
```

### Dashboard Can't Connect to Backend

```bash
# Test backend is reachable
curl http://127.0.0.1:8000/

# Expected: {"message":"NetAgent API is running"}
```

If not working:

1. Ensure backend is running
2. Check `NEXT_PUBLIC_API_URL` in dashboard `.env.local`

### LiveKit Connection Issues

```bash
# Test token generation
curl "http://127.0.0.1:8000/token?identity=test" | jq

# Should return: { "token": "...", "room": "netagent-room", "url": "wss://..." }
```

If token generation fails:

1. Check backend logs for errors
2. Verify `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` in `.env`
3. Restart backend to reload environment variables

### AI Predictions Not Working

```bash
# Check if Anthropic key is configured
curl http://127.0.0.1:8000/health | jq '.services.anthropic'

# Should show: { "api_key_configured": true, "status": "healthy" }
```

If failing:

1. Verify `ANTHROPIC_API_KEY` in backend `.env`
2. Ensure `telemetry_log.json` exists with data
3. Check backend logs for API errors

---

## Expected Behavior

### Backend Startup Logs

```
============================================================
NetAgent Backend Starting
============================================================
LiveKit URL: wss://peer-120-wspppl1a.livekit.cloud
LiveKit API Key: SET
LiveKit API Secret: SET
Anthropic API Key: SET
============================================================
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Dashboard Features

- **System Status Panel**: Shows health of LiveKit, Claude AI, and Telemetry
- **Latency Chart**: Real-time network performance visualization
- **Network Mesh Visualization**: Live P2P mesh with connected devices
- **P2P Communication**: Send alerts and messages between devices
- **Agent Activity Feed**: WebSocket stream of backend events

### P2P Mesh Behavior

- 1 tab open: "Live P2P mesh: You + 0 peers"
- 2 tabs open: "Live P2P mesh: You + 1 peer"
- 3 tabs open: "Live P2P mesh: You + 2 peers"

Messages sent from one tab appear in all other connected tabs.

---

## Environment Variables

### Backend (.env)

```bash
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
ANTHROPIC_API_KEY=your_anthropic_key
```

### Dashboard (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

## Common Issues

### "Cannot read properties of undefined"

- Usually a React component lifecycle issue
- Already handled with `isMounted` flags in components
- If persists, clear browser cache and restart

### "Token generation failed: undefined"

- Backend not running or not reachable
- Check backend is on http://127.0.0.1:8000
- Verify CORS settings if accessing from different port

### Ghost Devices in Mesh

- Fixed by using stable session IDs from `sessionStorage`
- Clear all tabs and reopen to reset mesh
- Run `sessionStorage.clear()` in browser console

### Telemetry Log Not Found

- Run `python3 client.py` to generate data
- Check `backend/telemetry_log.json` exists
- Backend creates it on first telemetry POST

---

## Quick Health Check

Run this to verify everything is configured:

```bash
# From project root
cd backend
uvicorn backend.main:app --reload &
sleep 3
curl http://127.0.0.1:8000/health | jq '.services'
```

All services should show `"status": "healthy"` or `"not_configured"`.

If any show `"unhealthy"`, check the specific service's configuration.
