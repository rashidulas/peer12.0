"use client";
import { useEffect, useState } from "react";

export default function AgentFeed() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const wsUrl = apiBase.replace(/^http/, "ws") + "/ws/agent-feed";
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (e) => setLogs((prev) => [...prev.slice(-20), e.data]);
    return () => ws.close();
  }, []);

  return (
    <div className="mt-6 p-4 border rounded-lg bg-white h-48 overflow-y-auto">
      <h3 className="font-semibold text-gray-700 mb-2">Agent Activity Feed</h3>
      {logs.map((log, i) => (
        <p key={i} className="text-sm text-gray-600">
          {log}
        </p>
      ))}
    </div>
  );
}
