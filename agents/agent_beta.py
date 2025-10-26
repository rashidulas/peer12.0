from agent_base import NetAgent

class AgentBeta(NetAgent):
    def __init__(self):
        super().__init__(
            name="Beta",
            location="Registration",
            ssid="Hackathon-AP2",
            bssid="00:11:22:33:44:02"
        )
    
    def receive_message(self, msg):
        print(f"[AgentBeta] Received: {msg}")
        if "High latency" in msg:
            print("[AgentBeta] Acknowledged congestion alert.")
