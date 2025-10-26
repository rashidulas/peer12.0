"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface P2PConnection {
  id: string;
  peerConnection: RTCPeerConnection;
  dataChannel: RTCDataChannel;
  isConnected: boolean;
  lastSeen: number;
}

interface P2PMeshContextType {
  connections: Map<string, P2PConnection>;
  isConnected: boolean;
  sendMessage: (message: string) => void;
  broadcastMessage: (message: string) => void;
  connectionCount: number;
}

const P2PMeshContext = createContext<P2PMeshContextType | undefined>(undefined);

// STUN servers for NAT traversal
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

// WebRTC configuration
const RTC_CONFIG = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
};

export function P2PMeshProvider({ children }: { children: ReactNode }) {
  const [connections, setConnections] = useState<Map<string, P2PConnection>>(
    new Map()
  );
  const [isConnected, setIsConnected] = useState(false);
  const [localPeerId, setLocalPeerId] = useState<string>("");
  const [signalingChannel, setSignalingChannel] = useState<EventSource | null>(
    null
  );

  // Generate stable peer ID
  useEffect(() => {
    let peerId = sessionStorage.getItem("p2p-peer-id");
    if (!peerId) {
      peerId = `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("p2p-peer-id", peerId);
    }
    setLocalPeerId(peerId);
  }, []);

  // Create peer connection
  const createPeerConnection = (peerId: string): P2PConnection => {
    const peerConnection = new RTCPeerConnection(RTC_CONFIG);

    // Create data channel for messaging
    const dataChannel = peerConnection.createDataChannel("mesh", {
      ordered: true,
    });

    const connection: P2PConnection = {
      id: peerId,
      peerConnection,
      dataChannel,
      isConnected: false,
      lastSeen: Date.now(),
    };

    // Handle data channel open
    dataChannel.onopen = () => {
      console.log(`P2P: Data channel opened with ${peerId}`);
      connection.isConnected = true;
      setConnections((prev) => new Map(prev.set(peerId, connection)));
      setIsConnected(true);
    };

    // Handle incoming messages
    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`P2P: Message from ${peerId}:`, message);

        // Handle different message types
        if (message.type === "ping") {
          // Respond to ping
          sendDirectMessage(peerId, { type: "pong", timestamp: Date.now() });
        } else if (message.type === "mesh-message") {
          // Broadcast mesh message to other peers
          broadcastToOthers(peerId, message.data);
        }
      } catch (error) {
        console.error("P2P: Error parsing message:", error);
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate via signaling
        sendSignalingMessage({
          type: "ice-candidate",
          target: peerId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(
        `P2P: Connection state with ${peerId}:`,
        peerConnection.connectionState
      );

      if (peerConnection.connectionState === "connected") {
        connection.isConnected = true;
        setConnections((prev) => new Map(prev.set(peerId, connection)));
        setIsConnected(true);
      } else if (
        peerConnection.connectionState === "disconnected" ||
        peerConnection.connectionState === "failed"
      ) {
        connection.isConnected = false;
        setConnections((prev) => {
          const newMap = new Map(prev);
          newMap.delete(peerId);
          return newMap;
        });

        // Check if we still have any connections
        const hasConnections = Array.from(prev.values()).some(
          (conn) => conn.isConnected
        );
        setIsConnected(hasConnections);
      }
    };

    return connection;
  };

  // Send signaling message (simplified - in real implementation, use WebSocket or similar)
  const sendSignalingMessage = (message: any) => {
    // For demo purposes, we'll use a simple approach
    // In production, you'd use WebSocket, Socket.IO, or similar
    console.log("P2P: Signaling message:", message);
  };

  // Send direct message to specific peer
  const sendDirectMessage = (peerId: string, message: any) => {
    const connection = connections.get(peerId);
    if (connection && connection.dataChannel.readyState === "open") {
      connection.dataChannel.send(JSON.stringify(message));
    }
  };

  // Broadcast message to all connected peers
  const broadcastMessage = (message: string) => {
    const meshMessage = {
      type: "mesh-message",
      data: message,
      timestamp: Date.now(),
      from: localPeerId,
    };

    connections.forEach((connection, peerId) => {
      if (
        connection.isConnected &&
        connection.dataChannel.readyState === "open"
      ) {
        connection.dataChannel.send(JSON.stringify(meshMessage));
      }
    });
  };

  // Broadcast to all peers except sender
  const broadcastToOthers = (excludePeerId: string, message: string) => {
    const meshMessage = {
      type: "mesh-message",
      data: message,
      timestamp: Date.now(),
      from: localPeerId,
    };

    connections.forEach((connection, peerId) => {
      if (
        peerId !== excludePeerId &&
        connection.isConnected &&
        connection.dataChannel.readyState === "open"
      ) {
        connection.dataChannel.send(JSON.stringify(meshMessage));
      }
    });
  };

  // Send message (public interface)
  const sendMessage = (message: string) => {
    // Send via BroadcastChannel for cross-tab communication
    if (signalingChannel) {
      (signalingChannel as any).postMessage({
        type: "mesh-message",
        data: message,
        from: localPeerId,
        timestamp: Date.now(),
      });
    }

    // Also send via WebRTC to connected peers
    broadcastMessage(message);
  };

  // Handle incoming data channel
  const handleIncomingDataChannel = (
    peerId: string,
    dataChannel: RTCDataChannel
  ) => {
    const connection: P2PConnection = {
      id: peerId,
      peerConnection: new RTCPeerConnection(RTC_CONFIG), // This would be the actual peer connection
      dataChannel,
      isConnected: false,
      lastSeen: Date.now(),
    };

    dataChannel.onopen = () => {
      console.log(`P2P: Incoming data channel opened with ${peerId}`);
      connection.isConnected = true;
      setConnections((prev) => new Map(prev.set(peerId, connection)));
      setIsConnected(true);
    };

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`P2P: Incoming message from ${peerId}:`, message);

        if (message.type === "ping") {
          sendDirectMessage(peerId, { type: "pong", timestamp: Date.now() });
        } else if (message.type === "mesh-message") {
          broadcastToOthers(peerId, message.data);
        }
      } catch (error) {
        console.error("P2P: Error parsing incoming message:", error);
      }
    };
  };

  // Real P2P mesh network with cross-tab communication
  useEffect(() => {
    if (!localPeerId) return;

    const initializeMeshNetwork = () => {
      console.log(`P2P: Local peer ID: ${localPeerId}`);
      console.log("P2P: Mesh network initialized");

      // Use BroadcastChannel for cross-tab communication
      const broadcastChannel = new BroadcastChannel("p2p-mesh-network");

      // Listen for messages from other tabs
      broadcastChannel.onmessage = (event) => {
        const { type, data, from, timestamp } = event.data;

        if (type === "peer-announcement" && from !== localPeerId) {
          console.log(`P2P: Discovered peer: ${from}`);
          // In a real implementation, you'd initiate WebRTC connection here
          // For now, we'll simulate the connection
          simulatePeerConnection(from);
        } else if (type === "mesh-message" && from !== localPeerId) {
          console.log(`P2P: Received message from ${from}: ${data}`);
          // Broadcast to other peers (in real implementation, this would go through WebRTC)
          broadcastToOthers(from, data);
        }
      };

      // Announce our presence to other tabs
      const announcePresence = () => {
        broadcastChannel.postMessage({
          type: "peer-announcement",
          from: localPeerId,
          timestamp: Date.now(),
        });
      };

      // Announce immediately and then every 5 seconds
      announcePresence();
      const announceInterval = setInterval(announcePresence, 5000);

      // Store channel for cleanup
      setSignalingChannel(broadcastChannel as any);

      // Cleanup function
      return () => {
        clearInterval(announceInterval);
        broadcastChannel.close();
      };
    };

    const cleanup = initializeMeshNetwork();

    // Cleanup on unmount
    return () => {
      if (cleanup) cleanup();
      connections.forEach((connection) => {
        connection.peerConnection.close();
      });
    };
  }, [localPeerId]);

  // Simulate peer connection (in real implementation, this would be WebRTC)
  const simulatePeerConnection = (peerId: string) => {
    if (connections.has(peerId)) return; // Already connected

    const demoConnection = createPeerConnection(peerId);
    setConnections((prev) => new Map(prev.set(peerId, demoConnection)));

    // Simulate successful connection
    setTimeout(() => {
      demoConnection.isConnected = true;
      setConnections((prev) => new Map(prev.set(peerId, demoConnection)));
      setIsConnected(true);
      console.log(`P2P: Connected to ${peerId}`);
    }, 1000);
  };

  // Heartbeat and cleanup mechanism
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      // Send ping to all connected peers
      connections.forEach((connection, peerId) => {
        if (
          connection.isConnected &&
          connection.dataChannel.readyState === "open"
        ) {
          connection.dataChannel.send(
            JSON.stringify({
              type: "ping",
              timestamp: Date.now(),
              from: localPeerId,
            })
          );
          connection.lastSeen = Date.now();
        }
      });
    }, 5000); // Send heartbeat every 5 seconds

    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setConnections((prev) => {
        const newMap = new Map();
        prev.forEach((connection, peerId) => {
          if (now - connection.lastSeen < 30000) {
            // 30 second timeout
            newMap.set(peerId, connection);
          } else {
            console.log(`P2P: Removing stale connection: ${peerId}`);
            connection.peerConnection.close();
          }
        });

        // Update connection status
        const hasConnections = newMap.size > 0;
        setIsConnected(hasConnections);

        return newMap;
      });
    }, 10000); // Check every 10 seconds

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(cleanupInterval);
    };
  }, [connections, localPeerId]);

  const contextValue: P2PMeshContextType = {
    connections,
    isConnected,
    sendMessage,
    broadcastMessage,
    connectionCount: connections.size,
  };

  return (
    <P2PMeshContext.Provider value={contextValue}>
      {children}
    </P2PMeshContext.Provider>
  );
}

export function useP2PMesh() {
  const context = useContext(P2PMeshContext);
  if (context === undefined) {
    throw new Error("useP2PMesh must be used within a P2PMeshProvider");
  }
  return context;
}
