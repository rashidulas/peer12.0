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
  ipAddress?: string;
}

interface P2PMeshContextType {
  connections: Map<string, P2PConnection>;
  isConnected: boolean;
  sendMessage: (message: string) => void;
  broadcastMessage: (message: string) => void;
  connectionCount: number;
  signalingStatus: "disconnected" | "connecting" | "connected";
  discoveredPeers: string[];
}

const P2PMeshContext = createContext<P2PMeshContextType | undefined>(undefined);

// STUN servers for NAT traversal
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

// WebRTC configuration
const RTC_CONFIG = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
};

// Get server URL based on environment
const getSignalingServerUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === ""
    ) {
      return "ws://localhost:8765";
    } else {
      return `ws://${hostname}:8765`;
    }
  }
  return "ws://localhost:8765";
};

export function RealP2PMeshProvider({ children }: { children: ReactNode }) {
  const [connections, setConnections] = useState<Map<string, P2PConnection>>(
    new Map()
  );
  const [isConnected, setIsConnected] = useState(false);
  const [localPeerId, setLocalPeerId] = useState<string>("");
  const [signalingSocket, setSignalingSocket] = useState<WebSocket | null>(
    null
  );
  const [signalingStatus, setSignalingStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [discoveredPeers, setDiscoveredPeers] = useState<string[]>([]);

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
      if (event.candidate && signalingSocket) {
        // Send ICE candidate via signaling server
        signalingSocket.send(
          JSON.stringify({
            type: "ice_candidate",
            target: peerId,
            candidate: event.candidate,
          })
        );
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
    broadcastMessage(message);
  };

  // Initialize WebSocket connection to signaling server
  useEffect(() => {
    if (!localPeerId) return;

    const connectToSignalingServer = () => {
      const serverUrl = getSignalingServerUrl();
      console.log(`P2P: Connecting to signaling server: ${serverUrl}`);

      setSignalingStatus("connecting");
      const socket = new WebSocket(serverUrl);

      socket.onopen = () => {
        console.log("P2P: Connected to signaling server");
        setSignalingStatus("connected");
        setSignalingSocket(socket);

        // Join the mesh network
        socket.send(
          JSON.stringify({
            type: "join",
            peer_id: localPeerId,
            room: "hackathon-mesh",
          })
        );
      };

      socket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("P2P: Signaling message:", message);

          switch (message.type) {
            case "peer_list":
              console.log("P2P: Received peer list:", message.peers);
              setDiscoveredPeers(message.peers.map((p: any) => p.peer_id));

              // Initiate connections to discovered peers
              for (const peer of message.peers) {
                if (peer.peer_id !== localPeerId) {
                  await initiateConnection(peer.peer_id);
                }
              }
              break;

            case "peer_joined":
              console.log(`P2P: Peer joined: ${message.peer_id}`);
              setDiscoveredPeers((prev) => [...prev, message.peer_id]);
              await initiateConnection(message.peer_id);
              break;

            case "peer_left":
              console.log(`P2P: Peer left: ${message.peer_id}`);
              setDiscoveredPeers((prev) =>
                prev.filter((id) => id !== message.peer_id)
              );
              // Close connection if exists
              const connection = connections.get(message.peer_id);
              if (connection) {
                connection.peerConnection.close();
                setConnections((prev) => {
                  const newMap = new Map(prev);
                  newMap.delete(message.peer_id);
                  return newMap;
                });
              }
              break;

            case "offer":
              await handleOffer(message.from, message.offer);
              break;

            case "answer":
              await handleAnswer(message.from, message.answer);
              break;

            case "ice_candidate":
              await handleIceCandidate(message.from, message.candidate);
              break;
          }
        } catch (error) {
          console.error("P2P: Error parsing signaling message:", error);
        }
      };

      socket.onclose = () => {
        console.log("P2P: Disconnected from signaling server");
        setSignalingStatus("disconnected");
        setSignalingSocket(null);

        // Attempt to reconnect after 3 seconds
        setTimeout(connectToSignalingServer, 3000);
      };

      socket.onerror = (error) => {
        console.error("P2P: Signaling server error:", error);
        setSignalingStatus("disconnected");
      };
    };

    connectToSignalingServer();

    // Cleanup
    return () => {
      if (signalingSocket) {
        signalingSocket.close();
      }
      connections.forEach((connection) => {
        connection.peerConnection.close();
      });
    };
  }, [localPeerId]);

  // Initiate WebRTC connection to a peer
  const initiateConnection = async (peerId: string) => {
    if (connections.has(peerId)) return; // Already connected

    console.log(`P2P: Initiating connection to ${peerId}`);
    const connection = createPeerConnection(peerId);

    try {
      // Create offer
      const offer = await connection.peerConnection.createOffer();
      await connection.peerConnection.setLocalDescription(offer);

      // Send offer via signaling server
      if (signalingSocket) {
        signalingSocket.send(
          JSON.stringify({
            type: "offer",
            target: peerId,
            offer: offer,
          })
        );
      }
    } catch (error) {
      console.error(`P2P: Error creating offer for ${peerId}:`, error);
    }
  };

  // Handle incoming offer
  const handleOffer = async (
    from: string,
    offer: RTCSessionDescriptionInit
  ) => {
    console.log(`P2P: Handling offer from ${from}`);

    if (connections.has(from)) return; // Already connected

    const connection = createPeerConnection(from);

    try {
      await connection.peerConnection.setRemoteDescription(offer);

      // Create answer
      const answer = await connection.peerConnection.createAnswer();
      await connection.peerConnection.setLocalDescription(answer);

      // Send answer via signaling server
      if (signalingSocket) {
        signalingSocket.send(
          JSON.stringify({
            type: "answer",
            target: from,
            answer: answer,
          })
        );
      }
    } catch (error) {
      console.error(`P2P: Error handling offer from ${from}:`, error);
    }
  };

  // Handle incoming answer
  const handleAnswer = async (
    from: string,
    answer: RTCSessionDescriptionInit
  ) => {
    console.log(`P2P: Handling answer from ${from}`);

    const connection = connections.get(from);
    if (!connection) return;

    try {
      await connection.peerConnection.setRemoteDescription(answer);
    } catch (error) {
      console.error(`P2P: Error handling answer from ${from}:`, error);
    }
  };

  // Handle incoming ICE candidate
  const handleIceCandidate = async (
    from: string,
    candidate: RTCIceCandidateInit
  ) => {
    console.log(`P2P: Handling ICE candidate from ${from}`);

    const connection = connections.get(from);
    if (!connection) return;

    try {
      await connection.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error(`P2P: Error handling ICE candidate from ${from}:`, error);
    }
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
    signalingStatus,
    discoveredPeers,
  };

  return (
    <P2PMeshContext.Provider value={contextValue}>
      {children}
    </P2PMeshContext.Provider>
  );
}

export function useRealP2PMesh() {
  const context = useContext(P2PMeshContext);
  if (context === undefined) {
    throw new Error("useRealP2PMesh must be used within a RealP2PMeshProvider");
  }
  return context;
}
