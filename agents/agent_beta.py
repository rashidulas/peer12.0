from agent_base import NetAgent

class AgentBeta(NetAgent):
    def receive_message(self, msg):
        print(f"[AgentBeta] Received: {msg}")
        if "High latency" in msg:
            print("[AgentBeta] Acknowledged congestion alert.")
