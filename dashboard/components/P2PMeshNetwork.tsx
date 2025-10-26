"use client";
import { useState, useEffect } from "react";
import { useRealP2PMesh } from "@/lib/RealP2PMeshService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface MeshMessage {
  id: string;
  content: string;
  from: string;
  timestamp: number;
  type: "user" | "system";
}

export default function P2PMeshNetwork() {
  const {
    connections,
    isConnected,
    sendMessage,
    connectionCount,
    signalingStatus,
    discoveredPeers,
  } = useRealP2PMesh();
  const [messages, setMessages] = useState<MeshMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [peerId, setPeerId] = useState("");

  // Get local peer ID
  useEffect(() => {
    const id = sessionStorage.getItem("p2p-peer-id") || "unknown";
    setPeerId(id);
  }, []);

  // Add system messages
  const addSystemMessage = (content: string) => {
    const message: MeshMessage = {
      id: `sys-${Date.now()}`,
      content,
      from: "system",
      timestamp: Date.now(),
      type: "system",
    };
    setMessages((prev) => [...prev, message]);
  };

  // Handle connection changes
  useEffect(() => {
    if (isConnected) {
      addSystemMessage(
        `Connected to P2P mesh network (${connectionCount} peers)`
      );
    } else {
      addSystemMessage("Disconnected from P2P mesh network");
    }
  }, [isConnected, connectionCount]);

  // Add peer connection details
  useEffect(() => {
    if (connectionCount > 0) {
      const peerList = Array.from(connections.keys()).join(", ");
      addSystemMessage(`Active peers: ${peerList}`);
    }
  }, [connections]);

  // Handle sending messages
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: MeshMessage = {
      id: `msg-${Date.now()}`,
      content: newMessage,
      from: peerId,
      timestamp: Date.now(),
      type: "user",
    };

    // Add to local messages
    setMessages((prev) => [...prev, message]);

    // Send to mesh network
    sendMessage(newMessage);

    // Clear input
    setNewMessage("");
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get connection status color
  const getStatusColor = () => {
    if (isConnected) return "bg-green-500";
    if (connectionCount > 0) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Get status text
  const getStatusText = () => {
    if (signalingStatus === "connected" && isConnected) return "Connected";
    if (signalingStatus === "connecting") return "Connecting";
    if (signalingStatus === "disconnected") return "Disconnected";
    return "Unknown";
  };

  // Get signaling status color
  const getSignalingStatusColor = () => {
    switch (signalingStatus) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "disconnected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">P2P Mesh Network</h2>
          <p className="text-gray-600">
            Direct peer-to-peer communication without servers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${getSignalingStatusColor()}`}
          ></div>
          <span className="text-sm font-medium">{getStatusText()}</span>
          <Badge variant="outline">{connectionCount} connected</Badge>
          <Badge variant="secondary">{discoveredPeers.length} discovered</Badge>
          {isConnected && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
              Live
            </Badge>
          )}
        </div>
      </div>

      {/* Connection Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Network Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Your Peer ID:</span>
              <p className="text-gray-600 font-mono text-xs">{peerId}</p>
            </div>
            <div>
              <span className="font-medium">Connected Peers:</span>
              <p className="text-gray-600">{connectionCount}</p>
            </div>
            <div>
              <span className="font-medium">Network Type:</span>
              <p className="text-gray-600">WebRTC P2P</p>
            </div>
            <div>
              <span className="font-medium">Status:</span>
              <p className="text-gray-600">{getStatusText()}</p>
            </div>
          </div>

          {/* Discovered Peers */}
          {discoveredPeers.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <span className="font-medium">Discovered Peers:</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {discoveredPeers.map((peerId) => (
                  <Badge key={peerId} variant="outline" className="text-xs">
                    {peerId}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mesh Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 overflow-y-auto border rounded-lg p-4 space-y-2">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No messages yet. Send a message to start the conversation!
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.type === "system"
                      ? "bg-blue-50 border border-blue-200"
                      : message.from === peerId
                      ? "bg-green-50 border border-green-200 ml-8"
                      : "bg-gray-50 border border-gray-200 mr-8"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">
                      {message.type === "system" ? "System" : message.from}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Message Input */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={!isConnected}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!isConnected || !newMessage.trim()}
            >
              Send
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {isConnected
              ? "Messages will be broadcast to all connected peers"
              : "Connect to the mesh network to send messages"}
          </p>
        </CardContent>
      </Card>

      {/* Technical Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Technical Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Protocol:</span>
              <span className="font-mono">WebRTC DataChannel</span>
            </div>
            <div className="flex justify-between">
              <span>NAT Traversal:</span>
              <span className="font-mono">STUN Servers</span>
            </div>
            <div className="flex justify-between">
              <span>Encryption:</span>
              <span className="font-mono">DTLS/SRTP</span>
            </div>
            <div className="flex justify-between">
              <span>Connection Type:</span>
              <span className="font-mono">Peer-to-Peer</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
