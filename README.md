# 🌐 Peer 12.0 - Intelligent Network Monitoring & Incident Response System

[![Next.js](https://img.shields.io/badge/Next.js-16.0.0-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.120.0-green)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://typescriptlang.org/)
[![LiveKit](https://img.shields.io/badge/LiveKit-WebRTC-orange)](https://livekit.io/)

> **Enterprise-grade network monitoring with AI-powered analysis, real-time P2P mesh networking, and automated incident response workflows.**

## 🎯 Overview

Peer 12.0 is a sophisticated real-time network monitoring and incident response system designed for large venues, hackathons, conferences, and enterprise environments. It combines AI-powered analysis, P2P mesh networking, vector-based clustering, and automated multi-channel incident response.

### ✨ Key Features

- 🤖 **AI-Powered Analysis** - Claude Sonnet 4 for intelligent network insights
- 🌐 **Real-Time P2P Mesh** - LiveKit WebRTC for collaborative monitoring
- 📊 **Vector-Based Clustering** - ChromaDB for intelligent network zone detection
- 🚨 **Automated Incident Response** - Multi-channel alerts (Email, Jira, Slack)
- 🏢 **Venue-Aware Monitoring** - Interactive floorplan with Wi-Fi signal overlay
- 📈 **Real-Time Visualization** - Advanced charts and heatmaps
- 🔄 **Distributed Agents** - Location-specific network monitoring
- ⚡ **Speed Testing** - Built-in network performance testing

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Data Layer    │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (ChromaDB)    │
│   Dashboard     │    │   API Server    │    │   Vector Store  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   AI Services   │              │
         └──────────────►│   (Claude)      │◄─────────────┘
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │   Automation    │
                        │   (Composio)    │
                        └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm or yarn

### 1. Clone & Install

```bash
git clone <repository-url>
cd peer12.0

# Install Python dependencies
cd backend
pip install -r requirements.txt

# Install Node.js dependencies
cd ../dashboard
npm install
```

### 2. Environment Configuration

Create `backend/.env`:

```bash
# LiveKit Configuration
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# AI Services
ANTHROPIC_API_KEY=your_anthropic_key

# Automation (Optional)
COMPOSIO_API_KEY=your_composio_key
COMPOSIO_ENTITY_ID=netagent-default
ALERT_EMAIL_TO=admin@yourcompany.com
JIRA_PROJECT_KEY=NET
SLACK_CHANNEL=#connectivity-alerts

# ChromaDB (Optional - uses local by default)
CHROMA_API_KEY=your_chroma_key
CHROMA_HOST=https://api.trychroma.com
```

Create `dashboard/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 3. Start Services

**Backend (Terminal 1):**
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend (Terminal 2):**
```bash
cd dashboard
npm run dev
```

**Optional - Telemetry Client (Terminal 3):**
```bash
python3 client.py
```

### 4. Access the Application

- **Dashboard**: http://localhost:3000/dashboard
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 📊 Dashboard Features

### 🏠 Main Dashboard
- **Real-Time Latency Chart** - Live network performance with trend analysis
- **Venue Floorplan** - Interactive Wi-Fi signal strength overlay
- **System Status** - Service health monitoring
- **P2P Mesh Visualization** - Connected devices and communication

### 🔧 Tools Section
- **Speed Test Panel** - Network performance testing
- **Alert Management** - Incident response controls
- **Network Heatmap** - Vector-based health clustering

### 📈 Advanced Visualizations
- **Interactive Charts** - Recharts with smooth animations
- **Color-Coded Health Zones** - Excellent → Critical status indicators
- **Real-Time Updates** - Live data refresh every 5 seconds
- **Responsive Design** - Works on all screen sizes

## 🔌 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Comprehensive service health check |
| `POST` | `/telemetry` | Network metrics ingestion |
| `GET` | `/predict` | AI-powered network analysis |
| `GET` | `/token` | LiveKit authentication tokens |

### Action Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/actions/speedtest` | Run network speed test |
| `POST` | `/actions/send-alert` | Trigger incident response |
| `POST` | `/actions/save-logs` | Archive telemetry logs |

### Heatmap Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/heatmap/zones` | Get network health zones |
| `GET` | `/heatmap/similar` | Find similar network conditions |

## 🤖 AI & Machine Learning

### Claude AI Integration
- **Real-time Analysis** - Continuous network condition assessment
- **Intelligent Recommendations** - Contextual suggestions for network issues
- **Incident Response** - Automated multi-step alert workflows
- **Threshold Detection** - Smart alerting based on network patterns

### Vector Database (ChromaDB)
- **3D Embeddings** - Latency, packet loss, and temporal factors
- **Similarity Search** - Find devices with similar network conditions
- **Health Clustering** - Automatic network zone detection
- **Temporal Analysis** - Time-based pattern recognition

## 🌐 P2P Mesh Networking

### LiveKit WebRTC Integration
- **Multi-Device Sync** - Real-time collaboration across devices
- **Session Management** - Stable connection handling
- **Message Broadcasting** - Peer-to-peer communication
- **Auto-Reconnection** - Robust connection recovery

### Agent System
- **Distributed Monitoring** - Location-specific network agents
- **Peer Coordination** - Agent-to-agent communication
- **Automatic Telemetry** - Continuous network measurement
- **Alert Broadcasting** - Real-time issue propagation

## 🚨 Incident Response System

### Multi-Channel Automation
1. **Email Alerts** - Gmail API integration
2. **Jira Tickets** - Automatic issue creation
3. **Slack Notifications** - Team channel alerts
4. **Rate Limiting** - Prevents alert spam
5. **Contextual Data** - Rich incident information

### Alert Triggers
- **High Latency** - Configurable thresholds (default: 200ms)
- **Packet Loss** - Critical loss detection (default: 10%)
- **Service Degradation** - AI-detected patterns
- **Manual Triggers** - On-demand alerting

## 🛠️ Technical Stack

### Frontend
- **Next.js 16** - React framework with Turbopack
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization
- **Radix UI** - Accessible components

### Backend
- **FastAPI** - High-performance Python API
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **Python 3.11** - Modern Python features

### Data & AI
- **ChromaDB** - Vector database
- **Anthropic Claude** - AI analysis
- **Composio** - Multi-service automation
- **LiveKit** - Real-time communication

### Monitoring
- **Ping3** - Network latency measurement
- **Custom Agents** - Distributed monitoring
- **WebSocket** - Real-time updates
- **REST API** - Standard HTTP interface

## 📁 Project Structure

```
peer12.0/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main API server
│   ├── ai_agent.py         # Claude AI integration
│   ├── chroma_service.py   # Vector database
│   ├── telemetry.py        # Metrics collection
│   └── requirements.txt    # Python dependencies
├── dashboard/              # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/              # Utilities & contexts
│   └── package.json      # Node dependencies
├── agents/                # Distributed agents
│   ├── agent_base.py     # Base agent class
│   ├── agent_alpha.py    # Alpha agent
│   ├── agent_beta.py     # Beta agent
│   └── run_agents.py     # Agent runner
├── client.py             # Simple telemetry client
└── README.md            # This file
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# Required
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
ANTHROPIC_API_KEY=your_anthropic_key

# Optional
COMPOSIO_API_KEY=your_composio_key
ALERT_EMAIL_TO=admin@yourcompany.com
JIRA_PROJECT_KEY=NET
SLACK_CHANNEL=#connectivity-alerts
CHROMA_API_KEY=your_chroma_key
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## 🚀 Deployment

### Development
```bash
# Backend
cd backend && uvicorn main:app --reload

# Frontend
cd dashboard && npm run dev
```

### Production
```bash
# Build frontend
cd dashboard && npm run build

# Start backend
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```

## 🧪 Testing

### Health Check
```bash
curl http://localhost:8000/health | jq
```

### Send Test Telemetry
```bash
curl -X POST http://localhost:8000/telemetry \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test","latency":50,"packetLoss":0}'
```

### Test AI Analysis
```bash
curl http://localhost:8000/predict | jq
```

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check port availability
lsof -i :8000

# Verify dependencies
cd backend && pip install -r requirements.txt
```

**Frontend can't connect:**
```bash
# Test backend connectivity
curl http://localhost:8000/

# Check environment variables
cat dashboard/.env.local
```

**LiveKit connection fails:**
```bash
# Test token generation
curl "http://localhost:8000/token?identity=test" | jq

# Verify credentials in .env
```

## 📈 Performance

### Benchmarks
- **API Response Time**: < 50ms average
- **Real-Time Updates**: 5-second intervals
- **Concurrent Users**: 100+ supported
- **Data Retention**: Configurable (default: 20 readings)

### Optimization
- **Caching**: AI predictions cached for 30 seconds
- **Rate Limiting**: Prevents API abuse
- **Connection Pooling**: Efficient database connections
- **Lazy Loading**: On-demand component loading

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **LiveKit** - Real-time communication platform
- **Anthropic** - Claude AI capabilities
- **ChromaDB** - Vector database technology
- **Composio** - Multi-service automation
- **Next.js** - React framework
- **FastAPI** - Python web framework

---
