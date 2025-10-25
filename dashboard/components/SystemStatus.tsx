"use client";
import { useEffect, useState } from "react";

interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    livekit?: {
      status: string;
      token_generation?: string;
      url?: string;
    };
    anthropic?: {
      status: string;
    };
    telemetry?: {
      status: string;
      log_file_exists?: boolean;
    };
  };
}

export default function SystemStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const res = await fetch(`${apiBase}/health`);
        const data = await res.json();
        setHealth(data);
        setLoading(false);
      } catch (err) {
        console.error("Health check failed:", err);
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    if (status === "healthy") return "text-green-600";
    if (status === "not_configured") return "text-yellow-600";
    if (status === "unhealthy") return "text-red-600";
    return "text-gray-500";
  };

  const getStatusEmoji = (status: string) => {
    if (status === "healthy") return "●";
    if (status === "not_configured") return "◐";
    if (status === "unhealthy") return "○";
    return "○";
  };

  if (loading) {
    return (
      <div className="mt-6 p-4 border rounded-xl bg-gray-50">
        <h3 className="font-semibold mb-2">System Status</h3>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="mt-6 p-4 border rounded-xl bg-red-50">
        <h3 className="font-semibold mb-2">System Status</h3>
        <p className="text-sm text-red-600">
          Cannot reach backend. Is it running on{" "}
          {process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}?
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 border rounded-xl bg-white">
      <h3 className="font-semibold mb-3 text-gray-800">
        System Status:{" "}
        <span className={getStatusColor(health.status)}>
          {health.status?.toUpperCase() || "UNKNOWN"}
        </span>
      </h3>

      <div className="space-y-2 text-sm">
        {/* LiveKit */}
        {health.services.livekit && (
          <div className="flex items-center justify-between">
            <span className="text-gray-700">
              {getStatusEmoji(health.services.livekit.status)} LiveKit
            </span>
            <span className={getStatusColor(health.services.livekit.status)}>
              {health.services.livekit.status === "healthy"
                ? "Token generation OK"
                : health.services.livekit.status === "not_configured"
                ? "Not configured"
                : "Error"}
            </span>
          </div>
        )}

        {/* Anthropic */}
        {health.services.anthropic && (
          <div className="flex items-center justify-between">
            <span className="text-gray-700">
              {getStatusEmoji(health.services.anthropic.status)} Claude AI
            </span>
            <span className={getStatusColor(health.services.anthropic.status)}>
              {health.services.anthropic.status === "healthy"
                ? "Ready"
                : "Not configured"}
            </span>
          </div>
        )}

        {/* Telemetry */}
        {health.services.telemetry && (
          <div className="flex items-center justify-between">
            <span className="text-gray-700">
              {getStatusEmoji(health.services.telemetry.status)} Telemetry
            </span>
            <span className={getStatusColor(health.services.telemetry.status)}>
              {health.services.telemetry.log_file_exists
                ? "Collecting data"
                : "No data yet"}
            </span>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Last checked: {new Date(health.timestamp).toLocaleTimeString()}
      </p>
    </div>
  );
}
