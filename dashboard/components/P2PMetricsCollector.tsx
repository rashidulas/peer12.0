"use client";
import { useEffect } from "react";
import { Room, RoomEvent, DataPacket_Kind } from "livekit-client";
import { useP2PMetrics } from "@/lib/P2PMetricsContext";

/**
 * Background component that maintains P2P connection and collects metrics
 * even when not viewing the P2P Mesh tab
 */
export default function P2PMetricsCollector() {
  const { addMetric } = useP2PMetrics();

  useEffect(() => {
    let lkRoom: Room | null = null;
    let healthInterval: NodeJS.Timeout;
    let isMounted = true;
    let connectTimeout: NodeJS.Timeout;

    const connectRoom = async () => {
      try {
        // Add a small delay to ensure any previous disconnection has completed
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (!isMounted) return;

        const apiBase =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

        // Use a stable identity per session (stored in sessionStorage)
        // Use the same key as NetworkMesh to avoid duplicate connections
        let sessionId = sessionStorage.getItem("mesh-session-id");
        if (!sessionId) {
          sessionId = `mesh-${Date.now()}`;
          sessionStorage.setItem("mesh-session-id", sessionId);
        }

        const res = await fetch(`${apiBase}/token?identity=${sessionId}`);

        if (!res.ok) {
          console.error(
            "P2PMetricsCollector: Token endpoint failed:",
            res.status,
            res.statusText
          );
          return;
        }

        const data = await res.json();
        const { token, url, error } = data;

        if (error || !token || !url) {
          console.error(
            "P2PMetricsCollector: Token generation failed:",
            error || "Missing token/url",
            data
          );
          return;
        }

        if (!isMounted) return;

        lkRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        if (!isMounted) {
          return;
        }

        await lkRoom.connect(url, token);

        if (!isMounted) {
          if (lkRoom && lkRoom.state === "connected") {
            lkRoom.disconnect();
          }
          return;
        }

        console.log("P2P Metrics Collector: Connected to LiveKit");

        // Broadcast health metrics every 3 seconds
        healthInterval = setInterval(() => {
          if (lkRoom && lkRoom.state === "connected" && isMounted) {
            const health = {
              type: "health",
              latency: Math.random() * 200, // Simulate varying latency
              packetLoss: Math.random() * 0.05, // 0-5% packet loss
            };

            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify(health));

            try {
              lkRoom.localParticipant.publishData(
                data,
                DataPacket_Kind.RELIABLE
              );
              // Add metric to global context for Health dashboard
              addMetric(health.latency, health.packetLoss);
            } catch (err) {
              // Silently handle disconnection errors
              console.debug("Failed to publish data:", err);
            }
          }
        }, 3000);
      } catch (err) {
        if (isMounted) {
          console.error("P2P Metrics Collector connection error:", err);
        }
      }
    };

    // Delay connection to allow previous cleanup
    connectTimeout = setTimeout(connectRoom, 100);

    return () => {
      isMounted = false;
      clearTimeout(connectTimeout);
      clearInterval(healthInterval);
      if (lkRoom && lkRoom.state === "connected") {
        console.log("P2P Metrics Collector: Disconnecting from LiveKit");
        try {
          lkRoom.disconnect();
        } catch (err) {
          // Ignore disconnection errors during cleanup
          console.debug("Disconnect error during cleanup:", err);
        }
      }
    };
  }, [addMetric]);

  // This component doesn't render anything
  return null;
}
