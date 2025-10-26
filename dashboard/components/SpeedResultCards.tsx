"use client";
import { useSpeedTest } from "@/lib/SpeedTestContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownToLine, ArrowUpToLine, Timer } from "lucide-react";
import EdgeGlowCard from "@/components/edge-glow-card";

// format download/upload into mbps/kbps with unit appended
function formatBitrate(mbps: number | null | undefined) {
  if (mbps == null) return "—";
  if (mbps >= 1) return `${mbps.toFixed(2)} mbps`;
  const kbps = mbps * 1000;
  return `${kbps >= 10 ? Math.round(kbps) : kbps.toFixed(1)} kbps`;
}

// format ping with ms
function formatPing(ms: number | null | undefined) {
  if (ms == null) return "—";
  return `${ms.toFixed(1)} ms`;
}

function StatCard({
  title,
  value,
  helper,
  icon,
}: {
  title: string;
  value: string;
  helper?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="relative bg-gradient-to-b from-muted/40 to-background shadow-sm h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
          <div className="rounded-md border bg-background p-1.5 text-muted-foreground">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-4xl font-semibold tracking-tight">{value}</div>
        {helper && <div className="mt-3 text-muted-foreground">{helper}</div>}
      </CardContent>
    </Card>
  );
}

export default function SpeedResultCards() {
  const { result, isRunning } = useSpeedTest();

  const items = [
    {
      title: "Download speed",
      value: formatBitrate(result?.download_mbps ?? null),
      helper: isRunning ? "Measuring…" : "Measured via latest test",
      icon: <ArrowDownToLine className="h-4 w-4" />,
    },
    {
      title: "Upload speed",
      value: formatBitrate(result?.upload_mbps ?? null),
      helper: isRunning ? "Measuring…" : "Measured via latest test",
      icon: <ArrowUpToLine className="h-4 w-4" />,
    },
    {
      title: "Ping",
      value: formatPing(result?.ping_ms ?? null),
      helper: isRunning ? "Measuring…" : "Measured via latest test",
      icon: <Timer className="h-4 w-4" />,
    },
  ];

  const serverLine =
    result?.server?.name
      ? `Server: ${result.server.name}${
          result.server.country ? `, ${result.server.country}` : ""
        }`
      : null;

  const timeLine = result?.timestamp
    ? new Date(result.timestamp).toLocaleString()
    : null;

  return (
    <>
      {/* Larger, evenly spread cards; nearly full width */}
      <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
        {items.map((it) => (
          <EdgeGlowCard key={it.title}>
            <StatCard
              title={it.title}
              value={it.value}
              helper={it.helper}
              icon={it.icon}
            />
          </EdgeGlowCard>
        ))}
      </div>

      {(serverLine || timeLine) && (
        <div className="mt-4 text-sm">
          <span className="font-medium">{serverLine}</span>
          {serverLine && timeLine ? " • " : ""}
          {timeLine ? (
            <span className="text-muted-foreground">Last run: {timeLine}</span>
          ) : null}
        </div>
      )}
    </>
  );
}
