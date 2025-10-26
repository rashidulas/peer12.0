"use client";
import * as React from "react";

/**
 * Theme-aware dotted spinner:
 * - Light mode: black dots
 * - Dark mode: white dots
 * - Uses currentColor, so overrideable with parent text classes
 */
export default function DottedSpinner({
  size = 16,
  dots = 12,
  className = "",
}: {
  size?: number;      // px box size
  dots?: number;      // number of dots around the circle
  className?: string; // e.g. "text-black dark:text-white"
}) {
  const radius = size / 2 - 2; // keep dots inside
  const items = Array.from({ length: dots });

  return (
    <span
      className={`relative inline-block align-middle ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
      role="progressbar"
    >
      {items.map((_, i) => {
        const angle = (i / dots) * 360;
        const delay = (i / dots) * 0.9; // cascade
        return (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 block rounded-full bg-current"
            style={{
              width: Math.max(2, Math.round(size * 0.16)),
              height: Math.max(2, Math.round(size * 0.16)),
              transform: `translate(-50%, -50%) rotate(${angle}deg) translate(${radius}px)`,
              animation: "dotFade 0.9s linear infinite",
              animationDelay: `${delay}s`,
              opacity: 0.2,
            }}
          />
        );
      })}
      <style jsx>{`
        @keyframes dotFade {
          0%   { opacity: 1;   }
          60%  { opacity: 0.25;}
          100% { opacity: 0.2; }
        }
      `}</style>
    </span>
  );
}
