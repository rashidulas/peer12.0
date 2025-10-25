"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import LatencyChart from "@/components/LatencyChart";
import AgentFeed from "@/components/AgentFeed";
import LiveKitP2P from "@/components/LiveKitP2P";
import SystemStatus from "@/components/SystemStatus";
import NetworkMesh from "@/components/NetworkMesh";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);

  // Fetch from FastAPI backend
  const fetchData = async () => {
    try {
      console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/predict`);
      const insight = res.data.insight || res.data;

      setData(insight);
      setLoading(false);

      // Keep last 20 entries for chart
      setLatencyHistory((prev) => [...prev.slice(-19), insight.avg_latency_ms]);
      setLabels((prev) => [
        ...prev.slice(-19),
        new Date().toLocaleTimeString(),
      ]);
    } catch (err) {
      console.error("Error fetching data:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // auto-refresh every 5 s
    return () => clearInterval(interval);
  }, []);

  //  Network status logic
  const getNetworkStatus = () => {
    if (!data) return { text: "No data", color: "text-gray-500", emoji: "⚪" };

    const { avg_latency_ms, avg_packet_loss } = data;
    if (avg_latency_ms >= 1500 || avg_packet_loss >= 0.2)
      return { text: "Critical", color: "text-red-600", emoji: "🚨" };
    else if (avg_latency_ms >= 300)
      return { text: "Degraded", color: "text-yellow-600", emoji: "⚠️" };
    else return { text: "Stable", color: "text-green-600", emoji: "🟢" };
  };

  const status = getNetworkStatus();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div
        className={`max-w-xl w-full rounded-2xl shadow-lg p-8 transition-all duration-500 ${
          status.text === "Stable"
            ? "bg-gradient-to-b from-green-50 to-white"
            : status.text === "Degraded"
            ? "bg-gradient-to-b from-yellow-50 to-white"
            : status.text === "Critical"
            ? "bg-gradient-to-b from-red-50 to-white"
            : "bg-white"
        }`}
      >
        <h1 className="text-3xl font-bold mb-2 text-center text-gray-800 flex items-center justify-center gap-2">
          NetAgent Dashboard
        </h1>

        {/* Network Status */}
        <div className="text-center mb-6 animate-pulse">
          <span className={`font-semibold ${status.color}`}>
            {status.emoji} {status.text}
          </span>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center">Loading metrics …</p>
        ) : (
          <>
            {/* Metrics section */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">
                  Average Latency:
                </span>
                <span className={`${status.color} font-semibold`}>
                  {data?.avg_latency_ms?.toFixed(2)} ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">
                  Packet Loss:
                </span>
                <span className={`${status.color} font-semibold`}>
                  {(data?.avg_packet_loss * 100).toFixed(1)} %
                </span>
              </div>
            </div>

            {/* Chart */}
            <div className="mt-6">
              <LatencyChart labels={labels} values={latencyHistory} />
              <SystemStatus />

              {/* Use EITHER NetworkMesh (visual mesh) OR LiveKitP2P (messaging focus) */}
              {/* For demo: NetworkMesh is more impressive visually */}
              <NetworkMesh />

              {/* Alternative: Use LiveKitP2P for messaging demo */}
              {/* <LiveKitP2P /> */}

              <AgentFeed />
            </div>

            {/* Claude Insight */}
            <div className="mt-6 border-t pt-4">
              <h2 className="text-lg font-semibold mb-2 text-gray-800">
                Claude AI Insight
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {data?.claude_recommendation || "No recommendation yet."}
              </p>
            </div>

            <p className="mt-6 text-sm text-gray-400 text-center">
              Auto-refreshes every 5 seconds ⏱️
            </p>
          </>
        )}
      </div>
    </main>
  );
}
