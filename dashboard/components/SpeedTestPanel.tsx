"use client";
import { useMemo } from "react";
import { useSpeedTest } from "@/lib/SpeedTestContext";
import MiniSpeedometer from "./MiniSpeedometer";
import DottedSpinner from "@/components/ui/DottedSpinner";

export default function SpeedTestPanel() {
  const { result, isRunning, error, runTest } = useSpeedTest();

  const gaugeMax = 200;
  const buttonLabel = useMemo(
    () => (isRunning ? "Running test..." : result ? "Run Test Again" : "Run Speed Test"),
    [isRunning, result]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Run a network speed test.</p>

        <button
          onClick={() => runTest()}
          disabled={isRunning}
          className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-70 inline-flex items-center gap-2"
        >
          {isRunning && (
            <DottedSpinner size={16} className="text-black dark:text-white" />
          )}
          {buttonLabel}
        </button>
      </div>

      <MiniSpeedometer
        isRunning={isRunning}
        value={result?.download_mbps ?? null}
        max={gaugeMax}
        label="Mbps"
      />

      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
