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
  const [hoveredZone, setHoveredZone] = useState<Zone | null>(null);

  const fetchHeatmap = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/heatmap/zones?limit=20`
      );

      if (res.data.zones) {
        setZones(res.data.zones);
        setStats(res.data.stats);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching heatmap:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmap();
    const interval = setInterval(fetchHeatmap, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

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
        <h2 className="text-lg font-semibold text-gray-800">
          Network Health Heatmap
        </h2>
        <div className="text-xs text-gray-500">
          {stats?.count || 0} zones tracked
        </div>
      </div>

      {zones.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No network data yet. Start collecting telemetry to see the heatmap.
        </div>
      ) : (
        <>
          {/* Grid Heatmap Visualization */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {zones.map((zone, idx) => (
              <div
                key={idx}
                className="relative group cursor-pointer"
                onMouseEnter={() => setHoveredZone(zone)}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <div
                  className="aspect-square rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg"
                  style={{
                    backgroundColor: zone.color,
                    opacity: 0.8,
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold drop-shadow-lg">
                      {zone.device_id.slice(0, 6)}
                    </span>
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
              </div>
            ))}
          </div>

          {/* Hovered Zone Details */}
          {hoveredZone && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800">
                  {hoveredZone.device_id}
                </h3>
                <span
                  className="px-2 py-1 text-xs font-semibold rounded-full text-white"
                  style={{ backgroundColor: hoveredZone.color }}
                >
                  {getHealthLabel(hoveredZone.health_score)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Latency</div>
                  <div className="font-semibold">
                    {hoveredZone.latency.toFixed(1)}ms
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Packet Loss</div>
                  <div className="font-semibold">
                    {(hoveredZone.packet_loss * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Health Score</div>
                  <div className="font-semibold">
                    {hoveredZone.health_score.toFixed(0)}/100
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Last seen:{" "}
                {new Date(hoveredZone.timestamp).toLocaleTimeString()}
              </div>
            </div>
          )}

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
            Powered by Chroma Vector DB • Real-time zone clustering
          </p>
        </>
      )}
    </div>
  );
}
