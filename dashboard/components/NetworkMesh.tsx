"use client";
import { useEffect, useState } from "react";
import { RoomEvent, DataPacket_Kind } from "livekit-client";
import { useLiveKit } from "@/lib/LiveKitService";

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
  const { room, isConnected } = useLiveKit();
  const [peers, setPeers] = useState<Map<string, PeerHealth>>(new Map());
  const [messages, setMessages] = useState<P2PMessage[]>([]);
  const [customMessage, setCustomMessage] = useState("");

  useEffect(() => {
    if (!room || !isConnected) return;

    let isMounted = true;

    // Listen for health updates from peers
    const handleData = (payload: Uint8Array, participant: any) => {
      if (!participant || !isMounted) return;

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
              status: getHealthStatus(message.latency, message.packetLoss),
              lastSeen: Date.now(),
            });
            return updated;
          });
        } else if (message.type === "alert" || message.type === "chat") {
          setMessages((prev) => [
            ...prev.slice(-9),
            {
              from: participant.identity,
              type: message.type,
              data: message.data || message.message || "",
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        }
      } catch (err) {
        console.error("Failed to parse P2P data:", err);
      }
    };

    const handleDisconnect = (participant: any) => {
      if (!participant || !isMounted) return;

      setPeers((prev) => {
        const updated = new Map(prev);
        updated.delete(participant.identity);
        return updated;
      });
    };

    room.on(RoomEvent.DataReceived, handleData);
    room.on(RoomEvent.ParticipantDisconnected, handleDisconnect);

    console.log("NetworkMesh: Listening to shared LiveKit room");

    return () => {
      isMounted = false;
      room.off(RoomEvent.DataReceived, handleData);
      room.off(RoomEvent.ParticipantDisconnected, handleDisconnect);
      console.log("NetworkMesh: Stopped listening to shared LiveKit room");
    };
  }, [room, isConnected]);

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

  const sendP2PMessage = (type: "alert" | "chat", data: any) => {
    if (room && room.state === "connected") {
      const message = {
        type,
        ...data,
      };
      const encoder = new TextEncoder();
      const encoded = encoder.encode(JSON.stringify(message));

      try {
        room.localParticipant.publishData(encoded, DataPacket_Kind.RELIABLE);
      } catch (err) {
        console.error("Failed to send P2P message:", err);
      }
    }
  };

  const sendTestAlert = () => {
    sendP2PMessage("alert", {
      message: "Test alert from mesh",
      severity: "warning",
    });
  };

  const sendCustomMessage = () => {
    if (!customMessage.trim()) return;

    sendP2PMessage("chat", {
      message: customMessage,
    });

    setCustomMessage("");
  };

  const peerArray = Array.from(peers.values());
  const healthyCount = peerArray.filter((p) => p.status === "healthy").length;

  // Calculate average latency from all peers
  const avgLatency =
    peerArray.length > 0
      ? peerArray.reduce((sum, p) => sum + p.latency, 0) / peerArray.length
      : 0;

  if (!isConnected) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Connecting to P2P network...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Network Mesh Visualization
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Live P2P mesh: You + {peers.size} peer{peers.size !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-green-700">P2P Active</span>
        </div>
      </div>

      {/* Peer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local peer (you) - removed since we don't track local metrics separately anymore */}

        {/* Remote peers */}
        {peerArray.map((peer) => (
          <div
            key={peer.id}
            className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${getStatusColor(
                    peer.status
                  )}`}
                ></div>
                <span className="font-medium text-gray-900">
                  {peer.identity}
                </span>
              </div>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Latency:</span>
                <span className="font-medium">{peer.latency.toFixed(1)}ms</span>
              </div>
              <div className="flex justify-between">
                <span>Loss:</span>
                <span className="font-medium">
                  {(peer.packetLoss * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>P2P Active</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {peers.size + 1}
          </div>
          <div className="text-sm text-gray-600">Devices</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {healthyCount}
          </div>
          <div className="text-sm text-gray-600">Healthy</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {avgLatency.toFixed(0)}ms
          </div>
          <div className="text-sm text-gray-600">Avg Latency</div>
        </div>
      </div>

      {/* P2P Communication */}
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="font-semibold mb-3 text-gray-900">P2P Communication</h3>

        <button
          onClick={sendTestAlert}
          className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Send Test Alert to Peers
        </button>

        <div className="flex gap-2">
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendCustomMessage()}
            placeholder="Type custom message..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendCustomMessage}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Send
          </button>
        </div>

        {messages.length > 0 && (
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">{msg.from}:</span>{" "}
                <span className="text-gray-600">{msg.data}</span>
                <span className="text-xs text-gray-400 ml-2">
                  {msg.timestamp}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400">
        Real-time mesh coordination via LiveKit data channels
      </p>
    </div>
  );
}
