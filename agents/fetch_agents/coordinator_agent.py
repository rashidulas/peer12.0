from uagents import Agent, Context
from models import CongestionAlert, AIInsight
from anthropic import Anthropic
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

agent = Agent(
    name="CoordinatorAgent",
    seed="coord-seed",
    port=8003,  # ✅ unique port
    endpoint=["http://127.0.0.1:8003/submit"]
)

@agent.on_message(model=CongestionAlert)
async def handle_congestion(ctx: Context, sender: str, msg: CongestionAlert):
    """Handle congestion alerts and generate global recommendations."""
    ctx.logger.warning(f"[Coordinator] Alert from {sender}: {msg.message} ({msg.latency:.1f} ms)")
    prompt = f"Device reported {msg.latency:.1f}ms latency. Suggest one concise strategy to improve connectivity."

    try:
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=60,
            messages=[{"role": "user", "content": prompt}],
        )
        insight = response.content[0].text
        ctx.logger.info(f"[Coordinator] Claude insight: {insight}")

        # Send back to sender and broadcast for awareness
        reply = AIInsight(sender="CoordinatorAgent", recommendation=insight)
        await ctx.send(sender, reply, AIInsight)
        await ctx.broadcast(reply, AIInsight)
    except Exception as e:
        ctx.logger.error(f"[Coordinator] Error in AI reasoning: {e}")

if __name__ == "__main__":
    agent.run()
