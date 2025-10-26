"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type ZoneHealth = {
  id: string;
  healthScore: number; // 0-100
  latencyMs: number;
  packetLoss: number; // 0-1
  label?: string; // optional human label if available
  ssid?: string;
  bssid?: string;
  timestamp?: string;
};

type ZoneMarker = ZoneHealth & {
  xPct: number; // 0-100
  yPct: number; // 0-100
  bars: 0 | 1 | 2 | 3 | 4; // wifi bars
  color: string; // hex or tailwind color
};

// Room coordinates mapping for the venue floorplan
const ROOM_COORDINATES: Record<string, { xPct: number; yPct: number }> = {
  Registration: { xPct: 85, yPct: 75 }, // Entrance/Check-In area
  "Main Hacking Space": { xPct: 25, yPct: 35 }, // Large central area
  Stage: { xPct: 10, yPct: 30 }, // Stage area
  "Mentor Tables": { xPct: 63, yPct: 55 }, // Mentor area
  "Food & Swag Distribution": { xPct: 50, yPct: 40 }, // Food area
  Rooms: { xPct: 50, yPct: 25 }, // Info desk
  "Sleeping Area": { xPct: 90, yPct: 55 }, // Sleeping area
  "Robotics Space": { xPct: 67, yPct: 37 }, // Robotics area
  "Workshop Room 1": { xPct: 80, yPct: 15 }, // Doe Workshop Room
  "Workshop Room 2": { xPct: 85, yPct: 15 }, // Bancroft Workshop Room
  Theater: { xPct: 90, yPct: 90 }, // Theater area
  "Mixers Area": { xPct: 50, yPct: 85 }, // Mixers area
  "Campanile Room": { xPct: 65, yPct: 30 }, // Campanile Room
  "Hearst Room": { xPct: 55, yPct: 10 }, // Hearst Room
  "Drink & Snack Bar": { xPct: 15, yPct: 15 }, // Top-left area
};

// Simple Wi‑Fi icon drawn as SVG, with variable bars count and color
function WifiIcon({ bars, color }: { bars: 0 | 1 | 2 | 3 | 4; color: string }) {
  const active = (n: number) => (bars >= n ? color : "#cbd5e1"); // slate-300 when inactive
  return (
    <svg
      width="38"
      height="30"
      viewBox="0 0 38 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* arcs */}
      <path
        d="M3 9C11.5 1.5 26.5 1.5 35 9"
        stroke={active(4)}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M7 14C13.5 8.5 24.5 8.5 31 14"
        stroke={active(3)}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M11 19C15 16 23 16 27 19"
        stroke={active(2)}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="19" cy="24" r="3.2" fill={active(1)} />
    </svg>
  );
}

function scoreToBars(score: number): 0 | 1 | 2 | 3 | 4 {
  if (score >= 80) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  if (score >= 20) return 1;
  return 0;
}

function scoreToColor(score: number): string {
  if (score >= 80) return "#22c55e"; // green
  if (score >= 60) return "#84cc16"; // lime
  if (score >= 40) return "#eab308"; // yellow
  if (score >= 20) return "#f97316"; // orange
  return "#ef4444"; // red
}

function smoothHealthScore(
  deviceId: string,
  newScore: number,
  history: Map<string, number[]>
): number {
  const currentHistory = history.get(deviceId) || [];
  const updatedHistory = [...currentHistory, newScore].slice(-5); // Keep last 5 readings

  // Calculate simple moving average
  const average =
    updatedHistory.reduce((sum, score) => sum + score, 0) /
    updatedHistory.length;

  // Update history
  history.set(deviceId, updatedHistory);

  return Math.round(average);
}

// Generate stable pseudo-random positions based on id
function seededRandom(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 0..1
  return (h >>> 0) / 4294967295;
}

function placeForId(
  id: string,
  label?: string
): { xPct: number; yPct: number } {
  // If we have a room label, use exact coordinates
  if (label && ROOM_COORDINATES[label]) {
    return ROOM_COORDINATES[label];
  }

  // Otherwise use stable random placement
  const r1 = seededRandom(id + "x");
  const r2 = seededRandom(id + "y");
  // keep inside safe margins so icons don't fall out of the floorplan
  const xPct = 6 + r1 * 88; // 6%..94%
  const yPct = 8 + r2 * 84; // 8%..92%
  return { xPct, yPct };
}

export default function VenueHeatmap() {
  const [markers, setMarkers] = useState<ZoneMarker[]>([]);
  const [selectedZone, setSelectedZone] = useState<ZoneMarker | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [healthHistory, setHealthHistory] = useState<Map<string, number[]>>(
    new Map()
  );
  const [mounted, setMounted] = useState(false);

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000",
    []
  );

  // Set mounted state to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadZones = async () => {
      try {
        const res = await fetch(`${apiBase}/heatmap/zones?limit=12`, {
          cache: "no-store",
        });
        let zones: ZoneHealth[] = [];
        if (res.ok) {
          const data = await res.json();
          // Backend returns {zones: [...], stats: {...}}
          const zonesData = data.zones || data;
          if (Array.isArray(zonesData) && zonesData.length > 0) {
            zones = zonesData.map((z: any, i: number) => ({
              id: z.device_id || `zone-${i}`,
              healthScore:
                typeof z.health_score === "number" ? z.health_score : 50,
              latencyMs: typeof z.latency === "number" ? z.latency : 100,
              packetLoss: typeof z.packet_loss === "number" ? z.packet_loss : 0,
              label: z.location || undefined,
              ssid: z.ssid || undefined,
              bssid: z.bssid || undefined,
              timestamp: z.timestamp || undefined,
            }));
          }
        }

        if (zones.length === 0) {
          // Fallback: generate demo zones with realistic room labels
          const roomNames = Object.keys(ROOM_COORDINATES);
          zones = Array.from({ length: 8 }).map((_, i) => ({
            id: `demo-${i}`,
            healthScore: Math.floor(20 + Math.random() * 80),
            latencyMs: Math.floor(20 + Math.random() * 220),
            packetLoss: Math.random() * 0.05,
            label: roomNames[i % roomNames.length],
            ssid: `Hackathon-${i + 1}`,
            bssid: `00:11:22:33:44:${(i + 1).toString(16).padStart(2, "0")}`,
            timestamp: new Date().toISOString(),
          }));
        }

        // Group zones by device_id to get the most recent data per device
        const latestZones = new Map<string, ZoneHealth>();
        zones.forEach((zone) => {
          const deviceId = zone.id;
          if (
            !latestZones.has(deviceId) ||
            new Date(zone.timestamp || "") >
              new Date(latestZones.get(deviceId)?.timestamp || "")
          ) {
            latestZones.set(deviceId, zone);
          }
        });

        const mapped: ZoneMarker[] = Array.from(latestZones.values()).map(
          (z, idx) => {
            const pos = placeForId(z.id + String(idx), z.label);
            const smoothedScore = smoothHealthScore(
              z.id,
              z.healthScore,
              healthHistory
            );
            return {
              ...z,
              healthScore: smoothedScore,
              xPct: pos.xPct,
              yPct: pos.yPct,
              bars: scoreToBars(smoothedScore),
              color: scoreToColor(smoothedScore),
            };
          }
        );

        if (!cancelled) {
          setMarkers(mapped);
          setHealthHistory(new Map(healthHistory));
          setLastUpdate(new Date());
        }
      } catch (e) {
        if (!cancelled) {
          // Still render a demo layout if API fails
          const roomNames = Object.keys(ROOM_COORDINATES);
          const fallback: ZoneMarker[] = Array.from({ length: 8 }).map(
            (_, i) => {
              const health = Math.floor(20 + Math.random() * 80);
              const roomName = roomNames[i % roomNames.length];
              const pos = placeForId("fallback-" + i, roomName);
              return {
                id: `fallback-${i}`,
                healthScore: health,
                latencyMs: Math.floor(20 + Math.random() * 220),
                packetLoss: Math.random() * 0.05,
                label: roomName,
                ssid: `Hackathon-${i + 1}`,
                bssid: `00:11:22:33:44:${(i + 1)
                  .toString(16)
                  .padStart(2, "0")}`,
                timestamp: new Date().toISOString(),
                xPct: pos.xPct,
                yPct: pos.yPct,
                bars: scoreToBars(health),
                color: scoreToColor(health),
              };
            }
          );
          setMarkers(fallback);
          setLastUpdate(new Date());
        }
      }
    };

    // Load initial data
    loadZones();

    // Set up polling for real-time updates every 5 seconds (less aggressive)
    const interval = setInterval(() => {
      if (!cancelled) {
        loadZones();
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [apiBase]);

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-xl bg-white">
        {/* Floorplan image */}
        <Image
          src="/venue-main-floor.png"
          alt="Venue floor plan"
          width={1400}
          height={700}
          priority
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            padding: "10px",
          }}
        />

        {/* Powered by Chroma badge */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg  flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#FF6B6B" opacity="0.8" />
            <path
              d="M2 17L12 22L22 17"
              stroke="#FF6B6B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="#FF6B6B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-xs font-medium text-gray-700">
            Powered by{" "}
            <span className="font-semibold text-gray-900">Chroma</span>
          </span>
        </div>

        {/* Overlay markers */}
        <div className="absolute inset-0">
          {markers.map((m) => (
            <div
              key={m.id}
              className="absolute cursor-pointer transition-transform hover:scale-110"
              style={{
                left: `${m.xPct}%`,
                top: `${m.yPct}%`,
                transform: "translate(-50%, -50%)",
              }}
              onClick={() => setSelectedZone(m)}
              title={`Click for details: ${m.label || m.id}`}
            >
              <div className="flex flex-col items-center">
                <div
                  className="rounded-full bg-white/80 p-2"
                  style={{
                    boxShadow: `0 0 0 3px ${m.color}40, 0 0 12px ${m.color}40`,
                  }}
                >
                  <WifiIcon bars={m.bars} color={m.color} />
                </div>
                <div className="mt-1 text-center text-[11px] font-medium text-gray-700 bg-white/80 px-1 rounded">
                  {m.label || "Zone"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "#22c55e" }}
            ></span>{" "}
            Excellent
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "#84cc16" }}
            ></span>{" "}
            Good
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "#eab308" }}
            ></span>{" "}
            Fair
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "#f97316" }}
            ></span>{" "}
            Degraded
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "#ef4444" }}
            ></span>{" "}
            Critical
          </span>
        </div>
        <div className="flex items-center gap-2 text-gray-500 mt-4">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>Live</span>
          </div>
          {mounted && lastUpdate && (
            <>
              <span>•</span>
              <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
            </>
          )}
          {/* <span>•</span> */}
          {/* <span className="text-xs">Smoothed</span> */}
        </div>
      </div>

      {/* Zone Details Modal */}
      {selectedZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Zone Details: {selectedZone.label || selectedZone.id}
              </h3>
              <button
                onClick={() => setSelectedZone(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Health Status */}
              <div className="flex items-center gap-3">
                <WifiIcon bars={selectedZone.bars} color={selectedZone.color} />
                <div>
                  <div className="font-medium text-gray-900">
                    Health Score: {selectedZone.healthScore}/100
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedZone.healthScore >= 80
                      ? "Excellent"
                      : selectedZone.healthScore >= 60
                      ? "Good"
                      : selectedZone.healthScore >= 40
                      ? "Fair"
                      : selectedZone.healthScore >= 20
                      ? "Degraded"
                      : "Critical"}
                  </div>
                </div>
              </div>

              {/* Network Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Latency</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {Math.round(selectedZone.latencyMs)}ms
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Packet Loss</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {(selectedZone.packetLoss * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Network Info */}
              {selectedZone.ssid && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">
                    Network Information
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                    <div className="text-sm">
                      <span className="text-gray-600">SSID:</span>{" "}
                      {selectedZone.ssid}
                    </div>
                    {selectedZone.bssid && (
                      <div className="text-sm">
                        <span className="text-gray-600">BSSID:</span>{" "}
                        {selectedZone.bssid}
                      </div>
                    )}
                    {selectedZone.timestamp && (
                      <div className="text-sm">
                        <span className="text-gray-600">Last Update:</span>{" "}
                        {new Date(selectedZone.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Suggested Actions */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  Suggested Actions
                </div>
                <div className="space-y-2">
                  {selectedZone.healthScore < 40 && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                      <div className="text-sm text-red-800">
                        <strong>Critical Issues Detected:</strong>
                        <ul className="mt-1 list-disc list-inside space-y-1">
                          <li>Check AP power and positioning</li>
                          <li>Verify channel allocation</li>
                          <li>Consider adding additional APs</li>
                          <li>Check for interference sources</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  {selectedZone.healthScore >= 40 &&
                    selectedZone.healthScore < 60 && (
                      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                        <div className="text-sm text-yellow-800">
                          <strong>Performance Degraded:</strong>
                          <ul className="mt-1 list-disc list-inside space-y-1">
                            <li>Monitor for congestion patterns</li>
                            <li>Consider load balancing</li>
                            <li>Check for channel overlap</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  {selectedZone.healthScore >= 60 && (
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <div className="text-sm text-green-800">
                        <strong>Network performing well</strong>
                        <ul className="mt-1 list-disc list-inside space-y-1">
                          <li>Continue monitoring</li>
                          <li>Maintain current configuration</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedZone(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
