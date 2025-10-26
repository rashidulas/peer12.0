"use client";
import { useLiveKit } from "@/lib/LiveKitService";

export function LiveKitStatus() {
  const { isConnected, connectionStatus } = useLiveKit();

  const getStatusColor = (status: string) => {
    if (status === "connected") return "text-green-600";
    if (status === "connecting" || status.includes("connecting"))
      return "text-yellow-600";
    if (status === "reconnecting") return "text-orange-600";
    return "text-red-600";
  };

  const getStatusIcon = (status: string) => {
    if (status === "connected") return "🟢";
    if (status === "connecting" || status.includes("connecting")) return "🟡";
    if (status === "reconnecting") return "🟠";
    return "🔴";
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 border">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-lg">{getStatusIcon(connectionStatus)}</span>
        <div>
          <div className="font-medium">LiveKit</div>
          <div className={`text-xs ${getStatusColor(connectionStatus)}`}>
            {connectionStatus}
          </div>
        </div>
      </div>
    </div>
  );
}
