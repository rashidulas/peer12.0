"use client";
import { useState } from "react";
import { useSimpleMesh } from "@/lib/SimpleMeshService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wifi, Users, Send, Radio } from "lucide-react";

export default function SimpleMeshNetwork() {
  const { peers, localPeer, messages, sendAnnouncement, isConnected } =
    useSimpleMesh();
  const [newMessage, setNewMessage] = useState("");

  // Handle sending messages
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendAnnouncement(newMessage);
    setNewMessage("");
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const peerArray = Array.from(peers.values());
  const totalDevices = peerArray.length + 1; // +1 for local peer

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Network Mesh Visualization</h2>
          <p className="text-gray-600 mt-1">
            Live P2P mesh: {totalDevices} device{totalDevices !== 1 ? "s" : ""}{" "}
            connected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 px-3 py-1"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            P2P Active
          </Badge>
        </div>
      </div>

      {/* Device Cards */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Connected Devices
            </CardTitle>
            <Badge variant="outline">{totalDevices} devices</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Local Device */}
            {localPeer && (
              <div className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="font-semibold text-gray-900">
                      {localPeer.name}
                    </span>
                  </div>
                  <Badge className="bg-blue-600 text-white">You</Badge>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Peer ID:</span>
                    <span className="font-mono text-xs">{localPeer.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <Wifi className="w-3 h-3 text-blue-500" />
                    <span className="text-xs">Broadcasting</span>
                  </div>
                </div>
              </div>
            )}

            {/* Remote Peers */}
            {peerArray.map((peer) => (
              <div
                key={peer.id}
                className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="font-semibold text-gray-900">
                      {peer.name}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Peer
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Peer ID:</span>
                    <span className="font-mono text-xs">{peer.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-medium text-green-600">
                      Connected
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <Radio className="w-3 h-3 text-green-500" />
                    <span className="text-xs">
                      Active {Math.floor((Date.now() - peer.joinedAt) / 1000)}s
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {peerArray.length === 0 && (
              <div className="col-span-full p-8 text-center border-2 border-dashed rounded-lg bg-gray-50">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium mb-1">
                  No other devices connected
                </p>
                <p className="text-sm text-gray-500">
                  Open this page in another tab or browser to see mesh
                  networking in action
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {totalDevices}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Devices</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {peerArray.length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Remote Peers</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {messages.filter((m) => m.type === "announcement").length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Announcements</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mesh Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Message Input */}
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type an announcement to broadcast..."
                disabled={!isConnected}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!isConnected || !newMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Send to All
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              {isConnected
                ? `Messages will be broadcast to all ${totalDevices} device${
                    totalDevices !== 1 ? "s" : ""
                  } in the mesh network`
                : "Waiting for connection..."}
            </p>

            {/* Messages List */}
            <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Send className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="font-medium mb-1">No announcements yet</p>
                  <p className="text-sm">
                    Send your first announcement to test the mesh network
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 ${
                      message.type === "system"
                        ? "bg-gray-50"
                        : message.from === localPeer?.id
                        ? "bg-blue-50"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">
                            {message.fromName}
                          </span>
                          {message.from === localPeer?.id && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-blue-600 text-white"
                            >
                              You
                            </Badge>
                          )}
                          {message.type === "system" && (
                            <Badge variant="secondary" className="text-xs">
                              System
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-700">{message.content}</p>
                      </div>
                      <span className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Technical Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Protocol:</span>
              <span className="font-mono font-medium">
                BroadcastChannel API
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Connection Type:</span>
              <span className="font-mono font-medium">Cross-Tab Mesh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Network Status:</span>
              <span className="font-medium text-green-600">Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Local Peer ID:</span>
              <span className="font-mono text-xs">{localPeer?.id || "—"}</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Demo Mode:</strong> This mesh network uses the
              BroadcastChannel API for real-time cross-tab communication. Open
              multiple tabs to see devices join the network automatically.
              Messages are broadcast to all connected tabs instantly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
