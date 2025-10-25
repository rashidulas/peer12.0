"use client";
import { useState } from "react";

export default function SpeedTestPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    download_mbps?: number;
    upload_mbps?: number;
    ping_ms?: number;
    server?: any;
    timestamp?: string;
  } | null>(null);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiBase}/actions/speedtest`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || res.statusText);
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setError(e?.message || "Speed test failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 p-4 border rounded-xl bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Speed Test</h3>
        <button
          onClick={runTest}
          disabled={loading}
          className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? "Running..." : "Run Speed Test"}
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {result && (
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {result.download_mbps?.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">Download (Mbps)</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {result.upload_mbps?.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">Upload (Mbps)</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {result.ping_ms?.toFixed(1)} ms
            </div>
            <div className="text-xs text-gray-600">Ping</div>
          </div>
        </div>
      )}

      {result?.server?.name && (
        <p className="mt-3 text-xs text-gray-500">
          Server: {result.server.name}, {result.server.country}
        </p>
      )}
    </div>
  );
}
