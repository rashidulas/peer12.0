"use client";
import { useMemo, useState, useEffect } from "react";
import { useSpeedTest } from "@/lib/SpeedTestContext";
import LargeSpeedometer from "./LargeSpeedometer";
import DottedSpinner from "@/components/ui/DottedSpinner";
import CompactAlertButton from "./CompactAlertButton";

export default function ImprovedSpeedTestPanel() {
  const { result, isRunning, error, runTest } = useSpeedTest();
  const [testPhase, setTestPhase] = useState<'idle' | 'ping' | 'download' | 'upload' | 'complete'>('idle');

  const buttonLabel = useMemo(
    () => (isRunning ? "Running test..." : result ? "Run Test Again" : "Start Speed Test"),
    [isRunning, result]
  );

  // Simulate test phases
  useEffect(() => {
    if (isRunning) {
      setTestPhase('ping');
      const timer1 = setTimeout(() => setTestPhase('download'), 1000);
      const timer2 = setTimeout(() => setTestPhase('upload'), 3000);
      const timer3 = setTimeout(() => setTestPhase('complete'), 5000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else {
      setTestPhase('idle');
    }
  }, [isRunning]);

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Internet Speed Test</h3>
          <p className="text-sm text-muted-foreground">
            {isRunning ? "Testing your connection..." : "Click start to test your internet speed"}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <CompactAlertButton />
          <button
            onClick={() => runTest()}
            disabled={isRunning}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-70 inline-flex items-center gap-2 font-medium transition-colors"
          >
            {isRunning && (
              <DottedSpinner size={16} className="text-white" />
            )}
            {buttonLabel}
          </button>
        </div>
      </div>

      {/* Large Speedometer */}
      <LargeSpeedometer
        downloadValue={result?.download_mbps ?? null}
        uploadValue={result?.upload_mbps ?? null}
        pingValue={result?.ping_ms ?? null}
        isRunning={isRunning}
        isDownloading={testPhase === 'download'}
        isUploading={testPhase === 'upload'}
        maxDownload={200}
        maxUpload={200}
      />

      {/* Test Status */}
      {isRunning && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
            <DottedSpinner size={16} />
            {testPhase === 'ping' && 'Testing ping...'}
            {testPhase === 'download' && 'Testing download speed...'}
            {testPhase === 'upload' && 'Testing upload speed...'}
            {testPhase === 'complete' && 'Finalizing results...'}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Server Info */}
      {result && (
        <div className="text-center text-sm text-muted-foreground">
          {result.server?.name && (
            <span>Server: {result.server.name}{result.server.country ? `, ${result.server.country}` : ""}</span>
          )}
          {result.timestamp && (
            <span className="ml-2">
              • Last run: {new Date(result.timestamp).toLocaleString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
