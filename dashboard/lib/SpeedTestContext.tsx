"use client";
import React, { createContext, useContext, useRef, useState, useCallback } from "react";

export type SpeedTestResult = {
  download_mbps?: number | null;
  upload_mbps?: number | null;
  ping_ms?: number | null;
  server?: { name?: string; country?: string } | null;
  timestamp?: string;
} | null;

type RunOpts = { fastSeconds?: number };

type SpeedTestCtx = {
  result: SpeedTestResult;
  isRunning: boolean;
  error: string | null;
  runTest: (opts?: RunOpts) => Promise<void>;
  setResult: (r: SpeedTestResult) => void; // keep exposed in case you need to seed
};

const Ctx = createContext<SpeedTestCtx | null>(null);

export function SpeedTestProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<SpeedTestResult>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // guard to prevent concurrent runs
  const inFlightRef = useRef<Promise<void> | null>(null);

  const runTest = useCallback(async (opts?: RunOpts) => {
    if (inFlightRef.current) return;          // already running
    setIsRunning(true);
    setError(null);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const qs = opts?.fastSeconds ? `?fastSeconds=${encodeURIComponent(opts.fastSeconds)}` : "";
    const doRun = async () => {
      try {
        const res = await fetch(`${apiBase}/actions/speedtest${qs}`, { method: "POST" });
        const data = await res.json();
        if (!res.ok || data?.error) {
          throw new Error(data?.error || res.statusText || "Speed test failed");
        }
        const normalized = {
          download_mbps:
            data.download_mbps ?? data.downloadMbps ?? data.download ?? data.down ?? null,
          upload_mbps:
            data.upload_mbps ?? data.uploadMbps ?? data.upload ?? data.up ?? null,
          ping_ms:
            data.ping_ms ?? data.pingMs ?? data.ping ?? data.latency_ms ?? data.latency ?? null,
          server: data.server ?? null,
          timestamp: data.timestamp ?? new Date().toISOString(),
        } as SpeedTestResult;
        setResult(normalized);
      } catch (e: any) {
        setError(e?.message || "Speed test failed");
        // keep last good result; do not clear it
      } finally {
        setIsRunning(false);
        inFlightRef.current = null;
      }
    };

    const p = doRun();
    inFlightRef.current = p;
    await p;
  }, []);

  const value: SpeedTestCtx = {
    result,
    isRunning,
    error,
    runTest,
    setResult,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSpeedTest() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSpeedTest must be used within SpeedTestProvider");
  return ctx;
}
