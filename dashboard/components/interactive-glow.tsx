"use client";
import { useRef } from "react";

export default function InteractiveGlow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={[
        "group relative rounded-xl",
        "[--glow:rgba(0,0,0,.25)] dark:[--glow:rgba(255,255,255,.35)]",
        className || "",
      ].join(" ")}
    >
      {/* Glow overlay that follows the cursor */}
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{
          background:
            "radial-gradient(120px 120px at var(--mx,50%) var(--my,50%), var(--glow) 0%, transparent 60%)",
        }}
      />
      {children}
    </div>
  );
}
