"use client";
import { useEffect, useState } from "react";
import { Room, RoomEvent } from "livekit-client";

export default function LiveKitPanel() {
  const [status, setStatus] = useState<"connecting" | "connected" | "error">(
    "connecting"
  );

  useEffect(() => {
    let didConnect = false;
    const connectRoom = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL;
        if (!apiBase) {
          setStatus("error");
          console.error("LiveKitPanel: NEXT_PUBLIC_API_URL not set");
          return;
        }
        if (didConnect) return;
        const res = await fetch(`${apiBase}/token?identity=peer-dashboard`);
        const { token, url } = await res.json();
        if (!token || !url) {
          setStatus("error");
          console.error(
            "LiveKitPanel: missing token or url from backend /token"
          );
          return;
        }

        const lkRoom = new Room();
        await lkRoom.connect(url, token);
        didConnect = true;

        setStatus("connected");
        console.log("Connected to LiveKit");

        lkRoom.on(RoomEvent.Disconnected, () => {
          setStatus("error");
          console.log("Disconnected from LiveKit");
        });
      } catch (err) {
        console.error("LiveKit connect error:", err);
        setStatus("error");
      }
    };

    connectRoom();
  }, []);

  return (
    <div className="mt-4 p-4 border rounded-xl bg-gray-50">
      <h3 className="font-semibold mb-2">🔗 Peer-to-Peer Fallback</h3>
      <p>
        Status:{" "}
        <span
          className={
            status === "connected"
              ? "text-green-600 font-semibold"
              : status === "error"
              ? "text-red-600 font-semibold"
              : "text-yellow-600 font-semibold"
          }
        >
          {status === "connected"
            ? "Connected"
            : status === "error"
            ? "Error"
            : "Connecting..."}
        </span>
      </p>
    </div>
  );
}
