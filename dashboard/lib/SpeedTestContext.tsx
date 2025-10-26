"use client";
import React, { createContext, useContext, useState } from "react";

export type SpeedTestResult = {
  download_mbps?: number;
  upload_mbps?: number;
  ping_ms?: number;
  server?: { name?: string; country?: string };
  timestamp?: string;
} | null;

type SpeedTestCtx = {
  result: SpeedTestResult;
  setResult: (r: SpeedTestResult) => void;
  isRunning: boolean;
  setIsRunning: (v: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
};

const Ctx = createContext<SpeedTestCtx | null>(null);

export function SpeedTestProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<SpeedTestResult>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Ctx.Provider value={{ result, setResult, isRunning, setIsRunning, error, setError }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSpeedTest() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSpeedTest must be used within SpeedTestProvider");
  return ctx;
}
