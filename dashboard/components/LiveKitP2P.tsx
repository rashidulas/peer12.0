"use client";
import { useEffect, useState } from "react";
import { Room, RoomEvent, DataPacket_Kind } from "livekit-client";

interface P2PMessage {
  from: string;
  type: "telemetry" | "alert" | "status";
  data: any;
  timestamp: string;
}

export default function LiveKitP2P() {
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<P2PMessage[]>([]);
  const [peerCount, setPeerCount] = useState(0);
  const [customMessage, setCustomMessage] = useState("");

  useEffect(() => {
    let didConnect = false;
    let isMounted = true;
    let lkRoom: Room | null = null;

    const connectRoom = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL;
        if (!apiBase) {
          setStatus("error");
          console.error("LiveKitP2P: NEXT_PUBLIC_API_URL not set");
          return;
        }
        if (didConnect || !isMounted) return;

        setStatus("connecting");

        // Use a stable identity per session
        let sessionId = sessionStorage.getItem("p2p-session-id");
        if (!sessionId) {
          sessionId = `dashboard-${Date.now()}`;
          sessionStorage.setItem("p2p-session-id", sessionId);
        }

        const res = await fetch(`${apiBase}/token?identity=${sessionId}`);

        if (!res.ok) {
          setStatus("error");
          console.error(
            "LiveKitP2P: Token endpoint failed:",
            res.status,
            res.statusText
          );
          return;
        }

        const data = await res.json();
        const { token, url, error } = data;

        if (error || !token || !url) {
          setStatus("error");
          console.error(
            "LiveKitP2P: Token generation failed:",
            error || "Missing token/url",
            data
          );
          return;
        }

        if (!isMounted) {
          return;
        }

        lkRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        // Listen for data from other peers
        lkRoom.on(
          RoomEvent.DataReceived,
          (payload: Uint8Array, participant) => {
            try {
              const decoder = new TextDecoder();
              const message: P2PMessage = JSON.parse(decoder.decode(payload));
              console.log("📡 P2P Message received:", message);
              setMessages((prev) => [...prev.slice(-9), message]);
            } catch (err) {
              console.error("Failed to parse P2P message:", err);
            }
          }
        );

        // Track peer connections
        lkRoom.on(RoomEvent.ParticipantConnected, (participant) => {
          console.log("👥 Peer joined:", participant.identity);
          setPeerCount(lkRoom!.participants.size);
        });

        lkRoom.on(RoomEvent.ParticipantDisconnected, (participant: any) => {
          console.log("Peer left:", participant.identity);
          setPeerCount(lkRoom!.participants.size);
        });

        lkRoom.on(RoomEvent.Disconnected, () => {
          setStatus("error");
          console.log("Disconnected from LiveKit");
        });

        await lkRoom.connect(url, token);

        if (!isMounted) {
          lkRoom.disconnect();
          return;
        }

        didConnect = true;
        setRoom(lkRoom);
        setStatus("connected");
        setPeerCount(lkRoom.participants.size);
        console.log("Connected to LiveKit P2P room");

        // Send initial status
        sendP2PMessage(lkRoom, {
          type: "status",
          data: { status: "online", role: "dashboard" },
        });

        // Simulate periodic telemetry sharing over P2P
        const interval = setInterval(() => {
          if (lkRoom && lkRoom.state === "connected" && isMounted) {
            sendP2PMessage(lkRoom, {
              type: "telemetry",
              data: {
                latency: Math.random() * 100,
                timestamp: Date.now(),
              },
            });
          }
        }, 10000); // Every 10 seconds

        return () => {
          clearInterval(interval);
          lkRoom?.disconnect();
        };
      } catch (err) {
        console.error("LiveKit connect error:", err);
        setStatus("error");
      }
    };

    connectRoom();

    return () => {
      isMounted = false;
      if (lkRoom) {
        lkRoom.disconnect();
      }
    };
  }, []);

  const sendP2PMessage = (room: Room, payload: { type: string; data: any }) => {
    const message: P2PMessage = {
      from: room.localParticipant.identity,
      type: payload.type as any,
      data: payload.data,
      timestamp: new Date().toISOString(),
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(message));

    // Send to all peers (reliable delivery)
    room.localParticipant.publishData(data, DataPacket_Kind.RELIABLE);
    console.log("📤 Sent P2P message:", message);
  };

  const sendTestMessage = () => {
    if (room && status === "connected") {
      sendP2PMessage(room, {
        type: "alert",
        data: { message: "High latency detected!", severity: "warning" },
      });
    }
  };

  const sendCustomMessage = () => {
    if (room && status === "connected" && customMessage.trim()) {
      sendP2PMessage(room, {
        type: "alert",
        data: { message: customMessage, severity: "info", custom: true },
      });
      setCustomMessage(""); // Clear input after sending
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-xl bg-white">
      <h3 className="font-semibold mb-3 text-gray-800">
        🔗 Peer-to-Peer Communication
      </h3>

      <div className="space-y-3">
        {/* Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">Status:</span>
          <span
            className={
              status === "connected"
                ? "text-green-600 font-semibold"
                : status === "error"
                ? "text-red-600 font-semibold"
                : status === "connecting"
                ? "text-yellow-600 font-semibold"
                : "text-gray-500"
            }
          >
            {status === "connected"
              ? "P2P Active"
              : status === "error"
              ? "Disconnected"
              : status === "connecting"
              ? "Connecting..."
              : "Idle"}
          </span>
        </div>

        {/* Peer Count */}
        {status === "connected" && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">Connected Peers:</span>
            <span className="text-blue-600 font-semibold">{peerCount}</span>
          </div>
        )}

        {/* Test Button */}
        {status === "connected" && (
          <>
            <button
              onClick={sendTestMessage}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
            >
              Send Test Alert to Peers
            </button>

            {/* Custom Message Input */}
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendCustomMessage()}
                placeholder="Type custom message..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendCustomMessage}
                disabled={!customMessage.trim()}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </>
        )}

        {/* Recent P2P Messages */}
        {messages.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-600 mb-2">
              Recent P2P Messages:
            </p>
            {messages.map((msg, i) => (
              <div key={i} className="text-xs text-gray-700 mb-1">
                <span className="font-mono text-blue-600">{msg.from}</span>:{" "}
                <span className="text-gray-500">{msg.type}</span> -{" "}
                {msg.data ? JSON.stringify(msg.data).slice(0, 50) : "no data"}
                ...
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <p className="text-xs text-gray-400 mt-2">
          {status === "connected"
            ? "✓ Sharing telemetry peer-to-peer"
            : status === "error"
            ? "Token generation working, but can't reach LiveKit server"
            : "Waiting to connect..."}
        </p>
      </div>
    </div>
  );
}
