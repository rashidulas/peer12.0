"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={[
        "relative inline-flex h-9 w-9 items-center justify-center rounded-full",
        "border border-foreground/10 bg-background/80 backdrop-blur",
        "shadow-[0_0_12px_rgba(99,102,241,.25)] hover:shadow-[0_0_22px_rgba(99,102,241,.45)]",
        "before:absolute before:inset-0 before:rounded-full before:animate-[pulseGlow_2s_ease-in-out_infinite]",
        "before:bg-[radial-gradient(closest-side,rgba(99,102,241,.28),transparent_60%)]",
        "transition-all duration-300",
      ].join(" ")}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <div className="relative">
        <Sun className={`h-4 w-4 transition-all duration-300 ${isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
        <Moon className={`h-4 w-4 absolute inset-0 transition-all duration-300 ${isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"}`} />
      </div>

      <style jsx>{`
        @keyframes pulseGlow {
          0%,100% { opacity:.35; transform:scale(.98) }
          50% { opacity:.7; transform:scale(1.03) }
        }
      `}</style>
    </button>
  );
}
