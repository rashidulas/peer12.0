from uagents import Agent, Context
from models import CongestionAlert, AIInsight
from anthropic import Anthropic
import os
from dotenv import load_dotenv

# Load Anthropic API key
load_dotenv()
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

agent = Agent(
    name="BetaAgent",
    seed="beta-seed",
    port=8002,  # ✅ unique port
    endpoint=["http://127.0.0.1:8002/submit"]
)

@agent.on_message(model=CongestionAlert)
async def respond_to_alert(ctx: Context, sender: str, msg: CongestionAlert):
    """React to congestion alerts and use Claude for reasoning."""
    ctx.logger.warning(f"Received congestion alert from {sender}: {msg.message} ({msg.latency:.1f} ms)")
    prompt = f"A peer reported {msg.latency:.1f}ms latency. Suggest one short action to stabilize the network."

    try:
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=60,
            messages=[{"role": "user", "content": prompt}],
        )
        insight = response.content[0].text
        reply = AIInsight(sender="BetaAgent", recommendation=insight)
        await ctx.send(sender, reply, AIInsight)
        ctx.logger.info(f"💡 Sent Claude insight: {insight}")
    except Exception as e:
        ctx.logger.error(f"Claude reasoning failed: {e}")

@agent.on_message(model=AIInsight)
async def receive_insight(ctx: Context, sender: str, msg: AIInsight):
    """Receive AI-generated recommendations."""
    ctx.logger.info(f"🧠 Received recommendation from {sender}: {msg.recommendation}")

if __name__ == "__main__":
    agent.run()
