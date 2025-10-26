# Peer 12.0

## Composio Integration (AI Automation Layer)

Composio lets the AI agent trigger real-world actions like running speed tests, saving logs, or sending alerts. This bridges insights (Claude) with actions.

### Setup

1. Add to backend requirements (already done):

```bash
pip install -r backend/requirements.txt
```

2. Configure backend `.env`:

```bash
COMPOSIO_API_KEY=your_composio_api_key
```

3. Start backend:

```bash
uvicorn backend.main:app --reload
```

### Endpoints

- `POST /actions/speedtest` — queue a speed test (placeholder)
- `POST /actions/save-logs` — queue log archival (placeholder)
- `POST /actions/send-alert?message=...` — queue an alert (placeholder)

These endpoints are ready to be wired to actual Composio tools once your workspace and connections are configured.
