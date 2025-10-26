"use client";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import SystemStatus from "@/components/SystemStatus";
import ImprovedSpeedTestPanel from "@/components/ImprovedSpeedTestPanel";
import LatencyChart from "@/components/LatencyChart";
import SimpleMeshNetwork from "@/components/SimpleMeshNetwork";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { P2PMetricsProvider, useP2PMetrics } from "@/lib/P2PMetricsContext";
import { LiveKitProvider } from "@/lib/LiveKitService";
import { SpeedTestProvider, useSpeedTest } from "@/lib/SpeedTestContext";
import { SimpleMeshProvider } from "@/lib/SimpleMeshService";
import VenueHeatmap from "@/components/VenueHeatmap";
import EdgeGlowCard from "@/components/edge-glow-card";
import { ArrowDownToLine, ArrowUpToLine, Timer } from "lucide-react";
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
          <CardHeader>
            <CardTitle>Venue Floorplan (Wi-Fi Signal Overlay)</CardTitle>
          </CardHeader>
          <CardContent>
            <VenueHeatmap />
          </CardContent>
        </Card>
        {/* <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <SystemStatus />
          </CardContent>
        </Card> */}
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
    ],
    [result, isRunning]
  );


  return (
    <section className="px-4 lg:px-8 max-w-screen-2xl mx-auto mt-2 space-y-8">
      {/* Main Speed Test Section */}
      <div className="w-full">
        <EdgeGlowCard>
          <Card className="p-0 overflow-hidden">
            <CardContent className="p-8">
              <ImprovedSpeedTestPanel />
            </CardContent>
          </Card>
        </EdgeGlowCard>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((it, index) => {
          const colors = [
            { bg: "from-blue-500/10 to-blue-600/5", border: "border-blue-200 dark:border-blue-800", icon: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
            { bg: "from-green-500/10 to-green-600/5", border: "border-green-200 dark:border-green-800", icon: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" },
            { bg: "from-orange-500/10 to-orange-600/5", border: "border-orange-200 dark:border-orange-800", icon: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" }
          ];
          const colorScheme = colors[index % colors.length];
          
          return (
            <EdgeGlowCard key={it.title}>
              <Card className={`relative bg-gradient-to-b ${colorScheme.bg} to-background shadow-sm h-full border ${colorScheme.border}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm text-muted-foreground">
                      {it.title}
                    </CardTitle>
                    <div className={`rounded-md border ${colorScheme.border} ${colorScheme.icon} p-1.5`}>
                      {it.icon}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-4xl font-semibold tracking-tight">
                    {it.value}
                  </div>
                  <div className="mt-3 text-muted-foreground">{it.helper}</div>
                </CardContent>
              </Card>
            </EdgeGlowCard>
          );
        })}
      </div>
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
      <AppSidebar
        variant="inset"
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-8 md:py-8">
              {activeView === "health" && <HomeSection />}
              {activeView === "mesh" && (
                <section className="px-4 lg:px-6">
                  <SimpleMeshNetwork />
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
          <SimpleMeshProvider>
            <DashboardContent />
          </SimpleMeshProvider>
        </SpeedTestProvider>
      </LiveKitProvider>
    </P2PMetricsProvider>
  );
}
