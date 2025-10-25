from agent_base import NetAgent

class AgentAlpha(NetAgent):
    def receive_message(self, msg):
        print(f"[AgentAlpha] Received: {msg}")
        if "High latency" in msg:
            print("[AgentAlpha] Recording neighbor congestion.")
