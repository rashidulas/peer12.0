from agent_base import NetAgent

class AgentAlpha(NetAgent):
    def __init__(self):
        super().__init__(
            name="Alpha",
            location="Main Hacking Space",
            ssid="Hackathon-AP1",
            bssid="00:11:22:33:44:01"
        )
    
    def receive_message(self, msg):
        print(f"[AgentAlpha] Received: {msg}")
        if "High latency" in msg:
            print("[AgentAlpha] Recording neighbor congestion.")
