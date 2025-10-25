"use client";
import { useEffect, useState } from "react";
import { Room, RoomEvent, DataPacket_Kind } from "livekit-client";

interface PeerHealth {
  id: string;
  identity: string;
  latency: number;
  packetLoss: number;
  status: "healthy" | "degraded" | "critical";
  lastSeen: number;
}

interface P2PMessage {
  from: string;
  type: "health" | "alert" | "chat";
  data: any;
  timestamp: string;
}

export default function NetworkMesh() {
  const [room, setRoom] = useState<Room | null>(null);
  const [peers, setPeers] = useState<Map<string, PeerHealth>>(new Map());
  const [messages, setMessages] = useState<P2PMessage[]>([]);
  const [customMessage, setCustomMessage] = useState("");
  const [myHealth, setMyHealth] = useState<PeerHealth>({
    id: "local",
    identity: "You",
    latency: 0,
    packetLoss: 0,
    status: "healthy",
    lastSeen: Date.now(),
  });

  useEffect(() => {
    let lkRoom: Room | null = null;
    let healthInterval: NodeJS.Timeout;
    let isMounted = true;

    const connectRoom = async () => {
      try {
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

        // Use a stable identity per session (stored in sessionStorage)
        let sessionId = sessionStorage.getItem("mesh-session-id");
        if (!sessionId) {
          sessionId = `mesh-${Date.now()}`;
          sessionStorage.setItem("mesh-session-id", sessionId);
        }

        const res = await fetch(`${apiBase}/token?identity=${sessionId}`);

        if (!res.ok) {
          console.error(
            "NetworkMesh: Token endpoint failed:",
            res.status,
            res.statusText
          );
          return;
        }

        const data = await res.json();
        const { token, url, error } = data;

        if (error || !token || !url) {
          console.error(
            "NetworkMesh: Token generation failed:",
            error || "Missing token/url",
            data
          );
          return;
        }

        if (!isMounted) return;

        lkRoom = new Room({
          // Add connection options for stability
          adaptiveStream: true,
          dynacast: true,
        });

        // Listen for health updates from peers
        lkRoom.on(
          RoomEvent.DataReceived,
          (payload: Uint8Array, participant: any) => {
            try {
              const decoder = new TextDecoder();
              const message = JSON.parse(decoder.decode(payload));

              if (message.type === "health") {
                setPeers((prev) => {
                  const updated = new Map(prev);
                  updated.set(participant.identity, {
                    id: participant.sid,
                    identity: participant.identity,
                    latency: message.latency,
                    packetLoss: message.packetLoss,
                    status: getHealthStatus(
                      message.latency,
                      message.packetLoss
                    ),
                    lastSeen: Date.now(),
                  });
                  return updated;
                });
              } else if (message.type === "alert" || message.type === "chat") {
                // Store other P2P messages for display
                setMessages((prev) => [
                  ...prev.slice(-9),
                  {
                    from: participant.identity,
                    type: message.type,
                    data: message.data,
                    timestamp: new Date().toISOString(),
                  },
                ]);
              }
            } catch (err) {
              console.error("Failed to parse P2P data:", err);
            }
          }
        );

        lkRoom.on(RoomEvent.ParticipantDisconnected, (participant: any) => {
          setPeers((prev) => {
            const updated = new Map(prev);
            updated.delete(participant.identity);
            return updated;
          });
        });

        await lkRoom.connect(url, token);

        if (!isMounted) {
          lkRoom.disconnect();
          return;
        }

        setRoom(lkRoom);

        // Broadcast own health every 3 seconds
        healthInterval = setInterval(() => {
          if (lkRoom && lkRoom.state === "connected" && isMounted) {
            const health = {
              type: "health",
              latency: Math.random() * 200, // Simulate varying latency
              packetLoss: Math.random() * 0.05, // 0-5% packet loss
            };

            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify(health));
            lkRoom.localParticipant.publishData(data, DataPacket_Kind.RELIABLE);

            // Update own display
            setMyHealth((prev) => ({
              ...prev,
              latency: health.latency,
              packetLoss: health.packetLoss,
              status: getHealthStatus(health.latency, health.packetLoss),
              lastSeen: Date.now(),
            }));
          }
        }, 3000);
      } catch (err) {
        console.error("Mesh connection error:", err);
      }
    };

    connectRoom();

    return () => {
      isMounted = false;
      clearInterval(healthInterval);
      if (lkRoom) {
        lkRoom.disconnect();
      }
    };
  }, []);

  const getHealthStatus = (
    latency: number,
    packetLoss: number
  ): "healthy" | "degraded" | "critical" => {
    if (latency > 150 || packetLoss > 0.1) return "critical";
    if (latency > 80 || packetLoss > 0.05) return "degraded";
    return "healthy";
  };

  const getStatusColor = (status: string) => {
    if (status === "healthy") return "bg-green-500";
    if (status === "degraded") return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusEmoji = (status: string) => {
    if (status === "healthy") return "●";
    if (status === "degraded") return "●";
    return "●";
  };

  const sendP2PMessage = (type: "alert" | "chat", data: any) => {
    if (room && room.state === "connected") {
      const message = {
        type,
        ...data,
      };
      const encoder = new TextEncoder();
      const encoded = encoder.encode(JSON.stringify(message));
      room.localParticipant.publishData(encoded, DataPacket_Kind.RELIABLE);
      console.log("Sent P2P message:", message);
    }
  };

  const handleSendAlert = () => {
    sendP2PMessage("alert", {
      data: { message: "High latency detected!", severity: "warning" },
    });
  };

  const handleSendCustom = () => {
    if (customMessage.trim()) {
      sendP2PMessage("chat", {
        data: { message: customMessage },
      });
      setCustomMessage("");
    }
  };

  const allPeers = [myHealth, ...Array.from(peers.values())];
  const peerCount = peers.size; // Actual peer count (excluding self)

  return (
    <div className="mt-4 p-4 border rounded-xl bg-white">
      <h3 className="font-semibold mb-3 text-gray-800">
        Network Mesh Visualization
      </h3>

      {room ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Live P2P mesh: You + {peerCount} peer{peerCount !== 1 ? "s" : ""}
            </p>
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
              ✅ P2P Active
            </span>
          </div>

          {/* Mesh Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allPeers.map((peer) => (
              <div
                key={peer.identity}
                className={`p-3 rounded-lg border-2 transition-all ${
                  peer.id === "local"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                {/* Device Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-gray-600 truncate">
                    {peer.identity.substring(0, 12)}...
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                      peer.status
                    )} text-white`}
                  >
                    {getStatusEmoji(peer.status)}
                  </span>
                </div>

                {/* Metrics */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Latency:</span>
                    <span className="font-semibold">
                      {peer.latency.toFixed(1)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Loss:</span>
                    <span className="font-semibold">
                      {(peer.packetLoss * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Connection Lines (Visual Effect) */}
                {peer.id !== "local" && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center text-xs text-gray-500">
                      <span className="mr-1">↔</span>
                      <span>P2P Active</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Network Stats */}
          <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {allPeers.length}
                </div>
                <div className="text-xs text-gray-600">Devices</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {allPeers.filter((p) => p.status === "healthy").length}
                </div>
                <div className="text-xs text-gray-600">Healthy</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {(
                    allPeers.reduce((sum, p) => sum + p.latency, 0) /
                    allPeers.length
                  ).toFixed(0)}
                  ms
                </div>
                <div className="text-xs text-gray-600">Avg Latency</div>
              </div>
            </div>
          </div>

          {/* P2P Messaging Controls */}
          <div className="mt-4 p-3 border rounded-lg bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              P2P Communication
            </h4>

            <div className="space-y-2">
              <button
                onClick={handleSendAlert}
                className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
              >
                Send Test Alert to Peers
              </button>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendCustom()}
                  placeholder="Type custom message..."
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendCustom}
                  disabled={!customMessage.trim()}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>

            {/* Recent P2P Messages */}
            {messages.length > 0 && (
              <div className="mt-3 p-2 bg-white rounded border max-h-24 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-600 mb-1">
                  Recent Messages:
                </p>
                {messages.map((msg, i) => (
                  <div key={i} className="text-xs text-gray-700 mb-1">
                    <span className="font-mono text-blue-600">
                      {msg.from.substring(0, 10)}...
                    </span>
                    : {msg.data?.message || "data"}
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-gray-400 text-center">
            Real-time mesh coordination via LiveKit data channels
          </p>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin text-xl mb-2">⟳</div>
          <p className="text-sm">Connecting to mesh network...</p>
        </div>
      )}
    </div>
  );
}
