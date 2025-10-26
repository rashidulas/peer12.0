from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    StartSessionContent,
    TextContent,
    chat_protocol_spec,
)
import speedtest
import statistics
from datetime import datetime
from uuid import uuid4

# --- Define Agent ---
agent = Agent(
    name="LocalLatencyCollectorAgent",
    port=8001,
    mailbox=True,
    publish_agent_details=True
)

# --- Chat Protocol ---
protocol = Protocol(spec=chat_protocol_spec)

# --- Helper function to create chat messages ---
def create_text_chat(text: str, end_session: bool = False) -> ChatMessage:
    content = [TextContent(type="text", text=text)]
    if end_session:
        content.append(EndSessionContent(type="end-session"))
    return ChatMessage(timestamp=datetime.utcnow(), msg_id=uuid4(), content=content)

# --- Startup event ---
@agent.on_event("startup")
async def on_start(ctx: Context):
    ctx.logger.info(f"🚀 LocalLatencyCollectorAgent online.")
    ctx.logger.info(f"🔗 Address: {ctx.agent.address}")

# --- Handle chat messages ---
@protocol.on_message(ChatMessage)
async def handle_chat(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(timestamp=datetime.utcnow(), acknowledged_msg_id=msg.msg_id))

    # Start of chat session
    if any(isinstance(c, StartSessionContent) for c in msg.content):
        await ctx.send(sender, create_text_chat("👋 Hi! I’m the LocalLatencyCollectorAgent. Type 'check network' or 'run test' to measure your real internet speed."))
        return

    text = msg.text().lower() if msg.text() else ""
    if "check" in text or "run" in text or "test" in text or "internet" in text:
        await ctx.send(sender, create_text_chat("⚙️ Running real network speed test... please wait."))

        try:
            s = speedtest.Speedtest()
            s.download()
            s.upload()
            latency = round(statistics.mean([s.results.ping]), 2)
            download = round(s.results.download / 1_000_000, 2)
            upload = round(s.results.upload / 1_000_000, 2)

            result = (
                f"📶 Latency: {latency} ms\n"
                f"📡 Download: {download} Mbps\n"
                f"📤 Upload: {upload} Mbps\n"
                f"✅ Connection stable and active."
            )
            await ctx.send(sender, create_text_chat(result, end_session=True))
            ctx.logger.info("✅ Speed test completed and reported.")

        except Exception as e:
            await ctx.send(sender, create_text_chat(f"⚠️ Error during speedtest: {e}", end_session=True))
            ctx.logger.error(f"Speedtest error: {e}")

    else:
        await ctx.send(sender, create_text_chat("🤖 I can check your network performance. Type 'check network' or 'run test' to begin."))

# --- Handle acknowledgements ---
@protocol.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass

# --- Attach protocol ---
agent.include(protocol, publish_manifest=True)

# --- Run agent ---
if __name__ == "__main__":
    agent.run()
