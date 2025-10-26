"use client";
import { useEffect, useCallback } from "react";
import { useSpeedTest } from "@/lib/SpeedTestContext";
import MiniSpeedometer from "./MiniSpeedometer";

export default function SpeedTestPanel() {
  const { result, setResult, isRunning, setIsRunning, error, setError } = useSpeedTest();

  const runTest = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setError(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiBase}/actions/speedtest`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || res.statusText);
      } else {
        const normalized = {
          download_mbps:
            data.download_mbps ?? data.downloadMbps ?? data.download ?? data.down ?? null,
          upload_mbps:
            data.upload_mbps ?? data.uploadMbps ?? data.upload ?? data.up ?? null,
          ping_ms:
            data.ping_ms ?? data.pingMs ?? data.ping ?? data.latency_ms ?? data.latency ?? null,
          server: data.server ?? null, // shown under the result cards, not here
          timestamp: data.timestamp ?? new Date().toISOString(),
        };
        setResult(normalized);
      }
    } catch (e: any) {
      setError(e?.message || "Speed test failed");
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, setError, setIsRunning, setResult]);

  // Auto-run on first mount (when the Tools page loads)
  useEffect(() => {
    runTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gaugeMax = 200; // tweak for your environment

  const buttonLabel = isRunning
    ? "Running test…"
    : result
    ? "Run Test Again"
    : "Run Speed Test";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Run a network speed test.</p>
        <button
          onClick={runTest}
          disabled={isRunning}
          className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-70 inline-flex items-center gap-2"
        >
          {isRunning && (
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" d="M4 12a8 8 0 018-8v4" stroke="currentColor" strokeWidth="4" />
            </svg>
          )}
          {buttonLabel}
        </button>
      </div>

      {/* Animated speedometer whose sweep speed scales with estimated speed while running */}
      <MiniSpeedometer
        isRunning={isRunning}
        value={result?.download_mbps ?? null}
        max={gaugeMax}
        label="Mbps"
      />

      {error && <div className="text-xs text-red-600">{error}</div>}
      {/* (Server + timestamp are displayed under the three result cards, not here.) */}
    </div>
  );
}
