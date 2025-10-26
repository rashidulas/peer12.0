"use client";
import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";

interface LargeSpeedometerProps {
  downloadValue?: number | null;
  uploadValue?: number | null;
  pingValue?: number | null;
  isRunning: boolean;
  /** kept for backward compat but not required for the canned animation */
  isDownloading?: boolean;
  isUploading?: boolean;
  maxDownload?: number;
  maxUpload?: number;
}

export default function LargeSpeedometer({
  downloadValue,
  uploadValue,
  pingValue,
  isRunning,
  isDownloading = false, // unused for canned animation (kept for API compat)
  isUploading = false,   // unused for canned animation (kept for API compat)
  maxDownload = 200,
  maxUpload = 200,
}: LargeSpeedometerProps) {
  const [downloadAngle, setDownloadAngle] = useState(-90);
  const [uploadAngle, setUploadAngle] = useState(-90);

  // Run independent RAFs so one gauge can’t cancel the other
  const dlRafRef = useRef<number | null>(null);
  const ulRafRef = useRef<number | null>(null);

  // --- helpers --------------------------------------------------------------

  // Map Mbps to gauge angle (-90..+90)
  const valueToAngle = (v: number, max: number) => {
    const clamped = Math.max(0, Math.min(v, max));
    const t = clamped / max; // 0..1
    return -90 + t * 180; // -90..+90
  };

  // Nice ease for settling to the final value
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  // Ping-pong 0→1→0… with period `periodMs`
  function pingPong01(elapsedMs: number, periodMs: number, phaseMs = 0) {
    const t = ((elapsedMs + phaseMs) % periodMs) / periodMs; // 0..1
    return t < 0.5 ? t * 2 : (1 - (t - 0.5) * 2); // 0..1..0
  }

  // --- Download animation ---------------------------------------------------

  useEffect(() => {
    // Cleanup helper
    const stop = () => {
      if (dlRafRef.current) {
        cancelAnimationFrame(dlRafRef.current);
        dlRafRef.current = null;
      }
    };

    // When a run starts, reset to 0 and do deterministic sweep loop
    if (isRunning) {
      stop();
      setDownloadAngle(-90); // start from 0 every time
      const periodMs = 2400; // slower, calm loop (~2.4s across)
      const startedAt = performance.now();

      const loop = () => {
        const now = performance.now();
        const elapsed = now - startedAt;
        const p = pingPong01(elapsed, periodMs); // 0..1..0
        const ang = -90 + p * 180; // -90..+90..-90
        setDownloadAngle(ang);
        dlRafRef.current = requestAnimationFrame(loop);
      };
      dlRafRef.current = requestAnimationFrame(loop);
      return stop;
    }

    // If we have a result, ease from current to final
    if (downloadValue != null && isFinite(downloadValue)) {
      stop();
      const target = valueToAngle(downloadValue, maxDownload);
      const start = downloadAngle;
      const dur = 700; // ms
      const t0 = performance.now();

      const settle = () => {
        const t = Math.min(1, (performance.now() - t0) / dur);
        const eased = start + (target - start) * easeOutCubic(t);
        setDownloadAngle(eased);
        if (t < 1) dlRafRef.current = requestAnimationFrame(settle);
      };
      dlRafRef.current = requestAnimationFrame(settle);
      return stop;
    }

    // No running & no value — just ensure no RAF is alive
    stop();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, downloadValue, maxDownload]);

  // --- Upload animation -----------------------------------------------------

  useEffect(() => {
    const stop = () => {
      if (ulRafRef.current) {
        cancelAnimationFrame(ulRafRef.current);
        ulRafRef.current = null;
      }
    };

    if (isRunning) {
      stop();
      setUploadAngle(-90);
      const periodMs = 2400;
      const startedAt = performance.now();

      const loop = () => {
        const now = performance.now();
        // small phase offset so upload isn’t identical to download
        const p = pingPong01(now - startedAt, periodMs, 250);
        const ang = -90 + p * 180;
        setUploadAngle(ang);
        ulRafRef.current = requestAnimationFrame(loop);
      };
      ulRafRef.current = requestAnimationFrame(loop);
      return stop;
    }

    if (uploadValue != null && isFinite(uploadValue)) {
      stop();
      const target = valueToAngle(uploadValue, maxUpload);
      const start = uploadAngle;
      const dur = 700;
      const t0 = performance.now();

      const settle = () => {
        const t = Math.min(1, (performance.now() - t0) / dur);
        const eased = start + (target - start) * easeOutCubic(t);
        setUploadAngle(eased);
        if (t < 1) ulRafRef.current = requestAnimationFrame(settle);
      };
      ulRafRef.current = requestAnimationFrame(settle);
      return stop;
    }

    stop();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, uploadValue, maxUpload]);

  // --- Styles / colors ------------------------------------------------------

  const getDownloadColor = () => {
    if (isRunning) return "stroke-blue-500";
    const v = downloadValue || 0;
    if (v < 10) return "stroke-red-500";
    if (v < 50) return "stroke-yellow-500";
    return "stroke-green-500";
  };

  const getUploadColor = () => {
    if (isRunning) return "stroke-blue-500";
    const v = uploadValue || 0;
    if (v < 5) return "stroke-red-500";
    if (v < 25) return "stroke-yellow-500";
    return "stroke-green-500";
  };

  // strokeDash helper for the arc “fill”
  const dashFromAngle = (ang: number) => `${(ang + 90) * 2.51} 502`;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-background to-muted/30 rounded-2xl p-8 border shadow-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Speed Test</h2>
          <p className="text-muted-foreground">Test your internet connection speed</p>
        </div>

        {/* Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Download */}
          <div className="text-center">
            <div className="relative inline-block">
              <svg width="200" height="120" viewBox="0 0 200 120" className="mx-auto">
                {/* Track */}
                <path
                  d="M20 100 A80 80 0 0 1 180 100"
                  className="fill-none stroke-muted-foreground/20"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                {/* “Progress” arc (cosmetic) */}
                <path
                  d="M20 100 A80 80 0 0 1 180 100"
                  className="fill-none stroke-blue-500/30"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={dashFromAngle(downloadAngle)}
                />
                <text x="100" y="50" textAnchor="middle" className="text-sm font-medium fill-muted-foreground">
                  DOWNLOAD
                </text>
                <circle cx="100" cy="100" r="6" className="fill-foreground/80" />
                <g transform={`rotate(${downloadAngle} 100 100)`}>
                  <line
                    x1="100" y1="100" x2="100" y2="30"
                    className={`stroke-4 ${getDownloadColor()}`}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="100"
                    cy="30"
                    r="3"
                    className={`fill-current ${getDownloadColor().replace("stroke-", "")}`}
                  />
                </g>
              </svg>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-foreground">
                {downloadValue != null
                  ? downloadValue.toFixed(1)
                  : isRunning
                  ? "…"
                  : "—"}
                <span className="text-lg text-muted-foreground ml-1">Mbps</span>
              </div>
            </div>
          </div>

          {/* Upload */}
          <div className="text-center">
            <div className="relative inline-block">
              <svg width="200" height="120" viewBox="0 0 200 120" className="mx-auto">
                <path
                  d="M20 100 A80 80 0 0 1 180 100"
                  className="fill-none stroke-muted-foreground/20"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <path
                  d="M20 100 A80 80 0 0 1 180 100"
                  className="fill-none stroke-green-500/30"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={dashFromAngle(uploadAngle)}
                />
                <text x="100" y="50" textAnchor="middle" className="text-sm font-medium fill-muted-foreground">
                  UPLOAD
                </text>
                <circle cx="100" cy="100" r="6" className="fill-foreground/80" />
                <g transform={`rotate(${uploadAngle} 100 100)`}>
                  <line
                    x1="100" y1="100" x2="100" y2="30"
                    className={`stroke-4 ${getUploadColor()}`}
                    strokeLinecap="round"
                  />
                    <circle
                      cx="100"
                      cy="30"
                      r="3"
                      className={`fill-current ${getUploadColor().replace("stroke-", "")}`}
                    />
                </g>
              </svg>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-foreground">
                {uploadValue != null
                  ? uploadValue.toFixed(1)
                  : isRunning
                  ? "…"
                  : "—"}
                <span className="text-lg text-muted-foreground ml-1">Mbps</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ping */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full">
            <Timer className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Ping</span>
            <span className="text-lg font-semibold text-foreground">
              {pingValue != null ? `${pingValue.toFixed(0)} ms` : isRunning ? "…" : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
