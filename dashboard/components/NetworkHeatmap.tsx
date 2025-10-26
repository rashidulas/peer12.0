"use client";
import { useState, useEffect } from "react";
import axios from "axios";

interface Zone {
  device_id: string;
  latency: number;
  packet_loss: number;
  health_score: number;
  timestamp: string;
  color: string;
}

export default function NetworkHeatmap() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Tooltip is purely CSS-driven (group-hover) for stable positioning
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [limit, setLimit] = useState(30);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchHeatmap = async () => {
    try {
      const res = await axios.get(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/heatmap/zones?limit=${limit}&_=${Date.now()}`
      );

      if (res.data.zones) {
        // Sort zones by health (worst first) then newest
        const sorted = [...res.data.zones]
          .sort((a: Zone, b: Zone) => a.health_score - b.health_score)
          .sort(
            (a: Zone, b: Zone) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        setZones(sorted);
        setStats(res.data.stats);
      }
      setLastUpdated(Date.now());
      setLoading(false);
    } catch (err) {
      console.error("Error fetching heatmap:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmap();
  }, [limit]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchHeatmap, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [autoRefresh, limit]);

  const getHealthLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    if (score >= 20) return "Poor";
    return "Critical";
  };

  if (loading) {
    return (
      <div className="mt-6 p-6 bg-white rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">
          Network Health Heatmap
        </h2>
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 p-6 bg-white rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-500">
            Visual clusters of network conditions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <span className="px-2 py-1 rounded-md border bg-gray-50">
              {stats?.count || zones.length} zones
            </span>
            {lastUpdated && (
              <span className="px-2 py-1 rounded-md border bg-gray-50">
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <label className="text-gray-600">Auto-refresh</label>
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={`px-2 py-1 rounded-md border ${
                autoRefresh
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-gray-50 text-gray-600"
              }`}
            >
              {autoRefresh ? "On" : "Off"}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <label className="text-gray-600">Limit</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-2 py-1 rounded-md border bg-white"
            >
              {[20, 30, 40, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchHeatmap}
            className="px-3 py-1.5 text-xs rounded-md border bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4 text-xs">
        {([80, 60, 40, 20, -1] as const).map((threshold, idx) => {
          const label =
            threshold === 80
              ? "Excellent"
              : threshold === 60
              ? "Good"
              : threshold === 40
              ? "Fair"
              : threshold === 20
              ? "Poor"
              : "Critical";
          const color =
            threshold === 80
              ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
              : threshold === 60
              ? "bg-lime-100 dark:bg-lime-900/20 text-lime-700 dark:text-lime-400 border-lime-200 dark:border-lime-800"
              : threshold === 40
              ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
              : threshold === 20
              ? "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800"
              : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
          const count = zones.filter((z) =>
            threshold === -1
              ? z.health_score < 20
              : z.health_score >= threshold &&
                z.health_score < (threshold === 80 ? 101 : threshold + 20)
          ).length;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between px-3 py-2 rounded-md border ${color}`}
            >
              <span className="font-medium">{label}</span>
              <span className="font-semibold">{count}</span>
            </div>
          );
        })}
      </div>

      {zones.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No network data yet. Start collecting telemetry to see the heatmap.
        </div>
      ) : (
        <>
          {/* Grid Heatmap Visualization */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-4">
            {zones.map((zone, idx) => (
              <div
                key={idx}
                className="relative group cursor-default hover:z-50"
              >
                <div
                  className="relative z-0 aspect-square rounded-lg transition-transform duration-200 hover:scale-[1.03] hover:shadow-md border border-white/50"
                  style={{
                    backgroundColor: zone.color,
                    opacity: 0.8,
                  }}
                >
                  <div className="absolute inset-0 p-2 flex flex-col justify-between">
                    <div className="text-white/90 text-[10px] font-semibold drop-shadow">
                      {zone.device_id.split("_")[0]}
                    </div>
                    <div className="text-[10px] text-white/90 drop-shadow flex justify-between">
                      <span>{zone.latency.toFixed(0)}ms</span>
                      <span>{(zone.packet_loss * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {/* Pulse animation for critical zones */}
                {zone.health_score < 40 && (
                  <div
                    className="absolute inset-0 rounded-lg animate-ping"
                    style={{
                      backgroundColor: zone.color,
                      opacity: 0.3,
                    }}
                  />
                )}
                {/* Floating tooltip anchored below tile (slightly left) */}
                <div className="pointer-events-none absolute top-full left-1/2 -translate-x-[60%] mt-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 transition-all duration-150 z-50">
                  <div className="relative rounded-lg border bg-white p-4 text-sm shadow-2xl min-w-[220px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-800 truncate max-w-[140px]">
                        {zone.device_id}
                      </span>
                      <span
                        className="ml-2 px-2 py-0.5 rounded-full text-white text-xs"
                        style={{ backgroundColor: zone.color }}
                      >
                        {getHealthLabel(zone.health_score)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-gray-700">
                      <div>
                        <div className="text-[11px] text-gray-500">Latency</div>
                        <div className="font-semibold">
                          {zone.latency.toFixed(1)}ms
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-500">Loss</div>
                        <div className="font-semibold">
                          {(zone.packet_loss * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-500">Score</div>
                        <div className="font-semibold">
                          {zone.health_score.toFixed(0)}/100
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-gray-400 text-right">
                      {new Date(zone.timestamp).toLocaleTimeString()}
                    </div>
                    {/* Arrow */}
                    <div className="absolute left-1/3 -translate-x-1/2 -top-1 h-2 w-2 rotate-45 bg-white border border-gray-200"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Hover details moved into floating tooltip above */}

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span>Excellent</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-lime-500"></div>
              <span>Good</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-yellow-500"></div>
              <span>Fair</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-orange-500"></div>
              <span>Poor</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span>Critical</span>
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-400 text-center">
            Powered by Chroma DB • Vector similarity for network conditions
          </p>
        </>
      )}
    </div>
  );
}
