"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface MeshPeer {
  id: string;
  name: string;
  joinedAt: number;
  lastSeen: number;
}

interface MeshMessage {
  id: string;
  from: string;
  fromName: string;
  content: string;
  timestamp: number;
  type: "announcement" | "system";
}

interface SimpleMeshContextType {
  peers: Map<string, MeshPeer>;
  localPeer: MeshPeer | null;
  messages: MeshMessage[];
  sendAnnouncement: (message: string) => void;
  isConnected: boolean;
}

const SimpleMeshContext = createContext<SimpleMeshContextType | undefined>(
  undefined
);

export function SimpleMeshProvider({ children }: { children: ReactNode }) {
  const [peers, setPeers] = useState<Map<string, MeshPeer>>(new Map());
  const [localPeer, setLocalPeer] = useState<MeshPeer | null>(null);
  const [messages, setMessages] = useState<MeshMessage[]>([]);
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);

  // Initialize local peer and broadcast channel
  useEffect(() => {
    // Generate or retrieve peer ID
    let peerId = sessionStorage.getItem("mesh-peer-id");
    let peerName = sessionStorage.getItem("mesh-peer-name");

    if (!peerId) {
      peerId = `device-${Math.random().toString(36).substr(2, 6)}`;
      sessionStorage.setItem("mesh-peer-id", peerId);
    }

    if (!peerName) {
      peerName = `Device ${Math.random()
        .toString(36)
        .substr(2, 4)
        .toUpperCase()}`;
      sessionStorage.setItem("mesh-peer-name", peerName);
    }

    const peer: MeshPeer = {
      id: peerId,
      name: peerName,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };

    setLocalPeer(peer);

    // Create broadcast channel for cross-tab communication
    const bc = new BroadcastChannel("p2p-mesh-demo");
    setChannel(bc);

    // Handle incoming messages from other tabs
    bc.onmessage = (event) => {
      const { type, data } = event.data;

      switch (type) {
        case "peer-announce":
          // Another peer is announcing itself
          setPeers((prev) => {
            const updated = new Map(prev);
            const isNewPeer = !prev.has(data.id);

            updated.set(data.id, {
              id: data.id,
              name: data.name,
              joinedAt: data.joinedAt,
              lastSeen: Date.now(),
            });

            // If this is a new peer, respond with our own announcement
            // so the new peer knows about us
            if (isNewPeer && peer) {
              setTimeout(() => {
                bc.postMessage({
                  type: "peer-announce",
                  data: {
                    id: peer.id,
                    name: peer.name,
                    joinedAt: peer.joinedAt,
                  },
                });
              }, 100); // Small delay to avoid message collision
            }

            return updated;
          });
          break;

        case "peer-heartbeat":
          // Update last seen time
          setPeers((prev) => {
            const existing = prev.get(data.id);
            if (existing) {
              const updated = new Map(prev);
              updated.set(data.id, {
                ...existing,
                lastSeen: Date.now(),
              });
              return updated;
            }
            return prev;
          });
          break;

        case "peer-leaving":
          // Remove peer
          setPeers((prev) => {
            const updated = new Map(prev);
            updated.delete(data.id);
            return updated;
          });
          break;

        case "announcement":
          // Add announcement message
          const msg: MeshMessage = {
            id: `msg-${Date.now()}-${Math.random()}`,
            from: data.from,
            fromName: data.fromName,
            content: data.content,
            timestamp: data.timestamp,
            type: "announcement",
          };
          setMessages((prev) => [...prev, msg]);
          break;
      }
    };

    // Announce presence
    const announcePresence = () => {
      bc.postMessage({
        type: "peer-announce",
        data: {
          id: peer.id,
          name: peer.name,
          joinedAt: peer.joinedAt,
        },
      });
    };

    // Initial announcement
    announcePresence();

    // Add system message
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        from: "system",
        fromName: "System",
        content: `${peer.name} joined the mesh network`,
        timestamp: Date.now(),
        type: "system",
      },
    ]);

    // Announce presence every 2 seconds (heartbeat)
    const heartbeatInterval = setInterval(() => {
      bc.postMessage({
        type: "peer-heartbeat",
        data: {
          id: peer.id,
        },
      });
    }, 2000);

    // Clean up stale peers every 5 seconds
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setPeers((prev) => {
        const updated = new Map();
        prev.forEach((peer, id) => {
          // Keep peers that were seen in the last 10 seconds
          if (now - peer.lastSeen < 10000) {
            updated.set(id, peer);
          }
        });
        return updated;
      });
    }, 5000);

    // Announce we're leaving on unmount
    return () => {
      bc.postMessage({
        type: "peer-leaving",
        data: {
          id: peer.id,
        },
      });

      clearInterval(heartbeatInterval);
      clearInterval(cleanupInterval);
      bc.close();
    };
  }, []);

  // Send announcement
  const sendAnnouncement = (content: string) => {
    if (!localPeer || !channel) return;

    // Broadcast to other tabs
    channel.postMessage({
      type: "announcement",
      data: {
        from: localPeer.id,
        fromName: localPeer.name,
        content,
        timestamp: Date.now(),
      },
    });

    // Add to local messages
    const msg: MeshMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      from: localPeer.id,
      fromName: localPeer.name,
      content,
      timestamp: Date.now(),
      type: "announcement",
    };
    setMessages((prev) => [...prev, msg]);
  };

  const contextValue: SimpleMeshContextType = {
    peers,
    localPeer,
    messages,
    sendAnnouncement,
    isConnected: peers.size > 0 || localPeer !== null,
  };

  return (
    <SimpleMeshContext.Provider value={contextValue}>
      {children}
    </SimpleMeshContext.Provider>
  );
}

export function useSimpleMesh() {
  const context = useContext(SimpleMeshContext);
  if (context === undefined) {
    throw new Error("useSimpleMesh must be used within a SimpleMeshProvider");
  }
  return context;
}
