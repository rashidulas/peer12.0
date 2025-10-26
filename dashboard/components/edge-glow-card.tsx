"use client";

import * as React from "react";

/**
 * EdgeGlowCard (single-edge, smoothed, clipped, size-aware)
 */
export default function EdgeGlowCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const timeoutRef = React.useRef<number | null>(null);

  // smoothing
  const targetPos = React.useRef(0.5);
  const currentPos = React.useRef(0.5);

  const ensureAnimLoop = React.useCallback(() => {
    if (rafRef.current != null) return;
    const tick = () => {
      const k = 0.08; // slower, smoother
      currentPos.current += (targetPos.current - currentPos.current) * k;
      const el = ref.current;
      if (el) el.style.setProperty("--pos", `${currentPos.current}`);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopAnimLoop = React.useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      stopAnimLoop();
    };
  }, [stopAnimLoop]);

  // compute clamped streak length based on card size
  const setLen = (edge: "top" | "bottom" | "left" | "right") => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const along = edge === "top" || edge === "bottom" ? rect.width : rect.height;
    // ~20% of the along dimension, clamped 90..220px
    const len = Math.max(90, Math.min(220, along * 0.2));
    el.style.setProperty("--lenpx", `${len}px`);
  };

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dTop = y;
    const dBottom = rect.height - y;
    const dLeft = x;
    const dRight = rect.width - x;

    let edge: "top" | "right" | "bottom" | "left" = "top";
    const min = Math.min(dTop, dBottom, dLeft, dRight);
    if (min === dTop) edge = "top";
    else if (min === dRight) edge = "right";
    else if (min === dBottom) edge = "bottom";
    else edge = "left";

    const pos =
      edge === "top" || edge === "bottom"
        ? Math.max(0, Math.min(1, x / rect.width))
        : Math.max(0, Math.min(1, y / rect.height));

    el.dataset.edge = edge;
    setLen(edge);
    targetPos.current = pos;
    ensureAnimLoop();
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    targetPos.current = 0.5;
    timeoutRef.current = window.setTimeout(() => {
      el.removeAttribute("data-edge");
      if (Math.abs(currentPos.current - 0.5) < 0.002) {
        stopAnimLoop();
      }
    }, 220);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={[
        "group relative rounded-xl overflow-hidden", // clip
        "[--glow:rgba(0,0,0,.40)] dark:[--glow:rgba(255,255,255,.68)]", // brighter but controlled
        className || "",
      ].join(" ")}
    >
      {/* TOP streak */}
      <span
        className="pointer-events-none absolute top-0 h-[2px]"
        style={{
          width: "var(--lenpx, 120px)",
          left: "calc((var(--pos, .5) * 100%) - (var(--lenpx, 120px) / 2))",
          background:
            "linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--glow) 14%, transparent) 22%, var(--glow) 52%, color-mix(in oklab, var(--glow) 14%, transparent) 78%, transparent 100%)",
          filter: "blur(1.1px)",
          opacity: 0,
          transition: "opacity .28s ease",
        }}
        data-edge-streak="top"
      />
      {/* BOTTOM streak */}
      <span
        className="pointer-events-none absolute bottom-0 h-[2px]"
        style={{
          width: "var(--lenpx, 120px)",
          left: "calc((var(--pos, .5) * 100%) - (var(--lenpx, 120px) / 2))",
          background:
            "linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--glow) 14%, transparent) 22%, var(--glow) 52%, color-mix(in oklab, var(--glow) 14%, transparent) 78%, transparent 100%)",
          filter: "blur(1.1px)",
          opacity: 0,
          transition: "opacity .28s ease",
        }}
        data-edge-streak="bottom"
      />
      {/* LEFT streak */}
      <span
        className="pointer-events-none absolute left-0 w-[2px]"
        style={{
          height: "var(--lenpx, 120px)",
          top: "calc((var(--pos, .5) * 100%) - (var(--lenpx, 120px) / 2))",
          background:
            "linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--glow) 14%, transparent) 22%, var(--glow) 52%, color-mix(in oklab, var(--glow) 14%, transparent) 78%, transparent 100%)",
          filter: "blur(1.1px)",
          opacity: 0,
          transition: "opacity .28s ease",
        }}
        data-edge-streak="left"
      />
      {/* RIGHT streak */}
      <span
        className="pointer-events-none absolute right-0 w-[2px]"
        style={{
          height: "var(--lenpx, 120px)",
          top: "calc((var(--pos, .5) * 100%) - (var(--lenpx, 120px) / 2))",
          background:
            "linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--glow) 14%, transparent) 22%, var(--glow) 52%, color-mix(in oklab, var(--glow) 14%, transparent) 78%, transparent 100%)",
          filter: "blur(1.1px)",
          opacity: 0,
          transition: "opacity .28s ease",
        }}
        data-edge-streak="right"
      />

      {/* softer inner halo so the edge looks defined but not blown out */}
      <span
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          boxShadow:
            "inset 0 0 0 1px color-mix(in oklab, var(--glow) 20%, transparent)",
          opacity: 0,
          transition: "opacity .28s ease",
        }}
        data-edge-halo
      />

      <style jsx>{`
        .group[data-edge="top"]    [data-edge-streak="top"],
        .group[data-edge="bottom"] [data-edge-streak="bottom"],
        .group[data-edge="left"]   [data-edge-streak="left"],
        .group[data-edge="right"]  [data-edge-streak="right"],
        .group[data-edge]          [data-edge-halo] {
          opacity: 1 !important;
        }

        .group[data-edge] [data-edge-streak] {
          animation: streakPulse 2.8s ease-in-out infinite;
        }
        @keyframes streakPulse {
          0%, 100% { filter: blur(1px) brightness(1); }
          50%      { filter: blur(1.6px) brightness(1.28); }
        }
      `}</style>

      {children}
    </div>
  );
}
