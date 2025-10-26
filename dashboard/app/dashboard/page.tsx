"use client";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import SystemStatus from "@/components/SystemStatus";
import SpeedTestPanel from "@/components/SpeedTestPanel";
import AlertPanel from "@/components/AlertPanel";
import NetworkMesh from "@/components/NetworkMesh";
import LatencyChart from "@/components/LatencyChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { P2PMetricsProvider, useP2PMetrics } from "@/lib/P2PMetricsContext";
import { LiveKitProvider } from "@/lib/LiveKitService";
import { SpeedTestProvider, useSpeedTest } from "@/lib/SpeedTestContext";
import VenueHeatmap from "@/components/VenueHeatmap";
import EdgeGlowCard from "@/components/edge-glow-card";
import { ArrowDownRight, ArrowUpRight, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/* HEALTH (unchanged) */
function HomeSection() {
  const { latencyHistory, labels } = useP2PMetrics();
  return (
    <>
      <div className="px-4 lg:px-6 grid gap-6">
        <LatencyChart labels={labels} values={latencyHistory} />
      </div>
      <section className="px-4 lg:px-6 grid gap-6">
        <Card>
          <CardHeader><CardTitle>Venue Floorplan (Wi-Fi Signal Overlay)</CardTitle></CardHeader>
          <CardContent><VenueHeatmap /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>System Status</CardTitle></CardHeader>
          <CardContent><SystemStatus /></CardContent>
        </Card>
      </section>
    </>
  );
}

/* formatting helpers */
function formatBitrate(mbps: number | null | undefined) {
  if (mbps == null) return "—";
  if (mbps >= 1) return `${mbps.toFixed(2)} mbps`;
  const kbps = mbps * 1000;
  return `${kbps >= 10 ? Math.round(kbps) : kbps.toFixed(1)} kbps`;
}
function formatPing(ms: number | null | undefined) {
  if (ms == null) return "—";
  return `${ms.toFixed(1)} ms`;
}

/* TOOLS */
function ToolsSection() {
  const { result, isRunning } = useSpeedTest();
  const items = useMemo(
    () => [
      { title: "Download speed", value: formatBitrate(result?.download_mbps ?? null), helper: isRunning ? "Measuring…" : "Measured via latest test", icon: <ArrowDownRight className="h-4 w-4" /> },
      { title: "Upload speed",   value: formatBitrate(result?.upload_mbps ?? null),   helper: isRunning ? "Measuring…" : "Measured via latest test", icon: <ArrowUpRight className="h-4 w-4" /> },
      { title: "Ping",           value: formatPing(result?.ping_ms ?? null),          helper: isRunning ? "Measuring…" : "Measured via latest test", icon: <Timer className="h-4 w-4" /> },
    ],
    [result, isRunning]
  );

  const serverLine =
    result?.server?.name ? `Server: ${result.server.name}${result.server.country ? `, ${result.server.country}` : ""}` : null;
  const timeLine = result?.timestamp ? new Date(result.timestamp).toLocaleString() : null;

  return (
    <section className="px-4 lg:px-8 max-w-screen-2xl mx-auto mt-2 grid grid-cols-12 gap-8">
      {/* top row */}
      <div className="col-span-12 lg:col-span-6">
        <EdgeGlowCard>
          <Card className="h-full">
            <CardHeader><CardTitle>Speed Test</CardTitle></CardHeader>
            <CardContent><SpeedTestPanel /></CardContent>
          </Card>
        </EdgeGlowCard>
      </div>
      <div className="col-span-12 lg:col-span-6">
        <EdgeGlowCard>
          <Card className="h-full">
            <CardHeader><CardTitle>Alerts</CardTitle></CardHeader>
            <CardContent><AlertPanel /></CardContent>
          </Card>
        </EdgeGlowCard>
      </div>

      {/* bottom row aligned exactly */}
      {items.map((it) => (
        <div key={it.title} className="col-span-12 md:col-span-6 lg:col-span-4">
          <EdgeGlowCard>
            <Card className="relative bg-gradient-to-b from-muted/40 to-background shadow-sm h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm text-muted-foreground">{it.title}</CardTitle>
                  <div className="rounded-md border bg-background p-1.5 text-muted-foreground">
                    {it.icon}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-4xl font-semibold tracking-tight">{it.value}</div>
                <div className="mt-3 text-muted-foreground">{it.helper}</div>
              </CardContent>
            </Card>
          </EdgeGlowCard>
        </div>
      ))}
      {(serverLine || timeLine) && (
        <div className="col-span-12 -mt-4 text-sm">
          <span className="font-medium">{serverLine}</span>
          {serverLine && timeLine ? " • " : ""}
          {timeLine ? <span className="text-muted-foreground">Last run: {timeLine}</span> : null}
        </div>
      )}
    </section>
  );
}

function DashboardContent() {
  const [activeView, setActiveView] = useState<string>("health");
  const { runTest } = useSpeedTest();

  // Run once on first mount (home). Keep deps empty so it doesn't retrigger.
  useEffect(() => {
    runTest({ fastSeconds: 3 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" activeView={activeView} onViewChange={setActiveView} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-8 md:py-8">
              {activeView === "health" && <HomeSection />}
              {activeView === "mesh" && (
                <section className="px-4 lg:px-6">
                  <Card>
                    <CardHeader><CardTitle>Network Mesh Visualization</CardTitle></CardHeader>
                    <CardContent><NetworkMesh /></CardContent>
                  </Card>
                </section>
              )}
              {activeView === "tools" && <ToolsSection />}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function Page() {
  return (
    <P2PMetricsProvider>
      <LiveKitProvider>
        <SpeedTestProvider>
          <DashboardContent />
        </SpeedTestProvider>
      </LiveKitProvider>
    </P2PMetricsProvider>
  );
}
