"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Room, RoomEvent, DataPacket_Kind } from "livekit-client";
import { useP2PMetrics } from "./P2PMetricsContext";

interface LiveKitContextType {
  room: Room | null;
  isConnected: boolean;
}

const LiveKitContext = createContext<LiveKitContextType | undefined>(undefined);

let globalRoom: Room | null = null; // Prevent duplicate connections in strict mode

export function LiveKitProvider({ children }: { children: ReactNode }) {
  const { addMetric } = useP2PMetrics();
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // If already connected (strict mode double-mount), reuse the connection
    if (globalRoom && globalRoom.state === "connected") {
      console.log("LiveKit: Reusing existing connection");
      setRoom(globalRoom);
      setIsConnected(true);
      return;
    }

    let lkRoom: Room | null = null;
    let healthInterval: NodeJS.Timeout;
    let isMounted = true;

    const connectRoom = async () => {
      try {
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

        // Use a stable identity per session
        let sessionId = sessionStorage.getItem("mesh-session-id");
        if (!sessionId) {
          sessionId = `mesh-${Date.now()}`;
          sessionStorage.setItem("mesh-session-id", sessionId);
        }

        const res = await fetch(`${apiBase}/token?identity=${sessionId}`);

        if (!res.ok) {
          console.error("LiveKit: Token endpoint failed:", res.status);
          return;
        }

        const data = await res.json();
        const { token, url, error } = data;

        if (error || !token || !url) {
          console.error("LiveKit: Token generation failed:", error);
          return;
        }

        if (!isMounted) return;

        lkRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        try {
          await lkRoom.connect(url, token);
        } catch (err) {
          console.error("LiveKit: Connection failed:", err);
          return;
        }

        if (!isMounted) {
          try {
            lkRoom?.disconnect();
          } catch (err) {
            // Ignore cleanup errors
          }
          return;
        }

        console.log("LiveKit: Connected");
        globalRoom = lkRoom; // Store globally to prevent duplicates
        setRoom(lkRoom);
        setIsConnected(true);

        // Update local metrics every 3 seconds (no LiveKit publish here)
        healthInterval = setInterval(() => {
          if (!isMounted) return;
          const health = {
            latency: Math.random() * 200,
            packetLoss: Math.random() * 0.05,
          };
          addMetric(health.latency, health.packetLoss);
        }, 3000);
      } catch (err) {
        console.error("LiveKit connection error:", err);
      }
    };

    connectRoom();

    return () => {
      isMounted = false;
      clearInterval(healthInterval);
      setIsConnected(false);
      setRoom(null);

      if (lkRoom && lkRoom === globalRoom) {
        console.log("LiveKit: Cleanup initiated");
        const roomToDisconnect = lkRoom;
        globalRoom = null; // Clear global reference immediately

        // Add a small delay to ensure no operations are in progress
        setTimeout(() => {
          try {
            if (roomToDisconnect && roomToDisconnect.state === "connected") {
              roomToDisconnect.disconnect();
              console.log("LiveKit: Disconnected");
            }
          } catch (err) {
            // Ignore cleanup errors
          }
        }, 200);
      }
    };
  }, [addMetric]);

  return (
    <LiveKitContext.Provider value={{ room, isConnected }}>
      {children}
    </LiveKitContext.Provider>
  );
}

export function useLiveKit() {
  const context = useContext(LiveKitContext);
  if (context === undefined) {
    throw new Error("useLiveKit must be used within a LiveKitProvider");
  }
  return context;
}
