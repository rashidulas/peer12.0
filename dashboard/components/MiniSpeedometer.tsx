"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Small SVG semicircle gauge.
 * - While running: needle sweeps with a speed that scales with estimated speed (dynamic).
 * - On final value: needle eases to the value angle and stops.
 */
export default function MiniSpeedometer({
  value,          // current Mbps (optional)
  isRunning,      // testing in progress
  max = 200,      // gauge max Mbps
  label = "Mbps", // caption
}: {
  value?: number | null;
  isRunning: boolean;
  max?: number;
  label?: string;
}) {
  // Internal angle [-90, +90]
  const [angle, setAngle] = useState(-90);
  const rafRef = useRef<number | null>(null);
  const dirRef = useRef<1 | -1>(1);

  // Convert Mbps to gauge angle
  const valueToAngle = (v: number) => {
    const clamped = Math.max(0, Math.min(v, max));
    const t = clamped / max; // 0..1
    return -90 + t * 180;    // -90..+90
  };

  // While running, sweep with speed tied to estimated throughput
  useEffect(() => {
    if (isRunning) {
      const animate = () => {
        const est = typeof value === "number" && isFinite(value) ? value : 0;
        // dynamic deg-per-frame: base + factor based on speed ratio
        const sweep = 1.2 + Math.min(est / max, 1) * 6.0; // 1.2..7.2 dpf
        setAngle((prev) => {
          let next = prev + dirRef.current * sweep;
          if (next > 90) { next = 90; dirRef.current = -1; }
          if (next < -90) { next = -90; dirRef.current = 1; }
          return next;
        });
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      };
    } else {
      // Ease to final value angle (if provided)
      if (value == null) return;
      const target = valueToAngle(value);
      const animateTo = () => {
        setAngle((prev) => {
          const diff = target - prev;
          const step = diff * 0.18; // easing
          if (Math.abs(diff) < 0.5) return target;
          return prev + step;
        });
        rafRef.current = requestAnimationFrame(animateTo);
      };
      rafRef.current = requestAnimationFrame(animateTo);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, value, max]);

  const color =
    angle < -30 ? "stroke-red-500"
    : angle < 30 ? "stroke-yellow-500"
    : "stroke-green-500";

  return (
    <div className="flex items-center gap-3">
      <svg width="110" height="70" viewBox="0 0 110 70" className="shrink-0">
        {/* Track */}
        <path
          d="M10 60 A45 45 0 0 1 100 60"
          className="fill-none stroke-muted-foreground/20"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Needle pivot */}
        <circle cx="55" cy="60" r="4" className="fill-foreground/70" />
        {/* Needle */}
        <g transform={`rotate(${angle} 55 60)`}>
          <line
            x1="55" y1="60" x2="55" y2="16"
            className={`stroke-[3] ${color}`}
            strokeLinecap="round"
          />
        </g>
      </svg>

      <div className="leading-none">
        <div className="text-xs text-muted-foreground">Download</div>
        <div className="text-xl font-semibold">
          {value != null ? value.toFixed(2) : (isRunning ? "…" : "—")}{" "}
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      </div>
    </div>
  );
}
