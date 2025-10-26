"use client";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import NetworkHeatmap from "@/components/NetworkHeatmap";
import SystemStatus from "@/components/SystemStatus";
import SpeedTestPanel from "@/components/SpeedTestPanel";
import AlertPanel from "@/components/AlertPanel";
import NetworkMesh from "@/components/NetworkMesh";
import LatencyChart from "@/components/LatencyChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { P2PMetricsProvider, useP2PMetrics } from "@/lib/P2PMetricsContext";
import { LiveKitProvider } from "@/lib/LiveKitService";
import { SpeedTestProvider } from "@/lib/SpeedTestContext";
import SpeedResultCards from "@/components/SpeedResultCards";

import { useState } from "react";

function HomeSection() {
  const { latencyHistory, labels } = useP2PMetrics();

  return (
    <>
      {/* Graph first on Home */}
      <div className="px-4 lg:px-6 grid gap-6">
        <LatencyChart labels={labels} values={latencyHistory} />
      </div>

      <section className="px-4 lg:px-6 grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Network Health Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <NetworkHeatmap />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <SystemStatus />
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function ToolsSection() {
  return (
    <>
      {/* Top row: the three stat cards (styled like shadcn metric boxes) */}
      <div className="px-4 lg:px-6">
        <SpeedResultCards />
      </div>

      {/* Second row: smaller Speed Test card on the left, Alerts on the right */}
      <section className="px-4 lg:px-6 mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Speed Test</CardTitle>
          </CardHeader>
          <CardContent>
            <SpeedTestPanel />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertPanel />
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function DashboardContent() {
  const [activeView, setActiveView] = useState<string>("health");

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
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {activeView === "health" && <HomeSection />}

              {activeView === "mesh" && (
                <section className="px-4 lg:px-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Network Mesh Visualization</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <NetworkMesh />
                    </CardContent>
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
