"use client";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import NetworkHeatmap from "@/components/NetworkHeatmap";
import SystemStatus from "@/components/SystemStatus";
import SpeedTestPanel from "@/components/SpeedTestPanel";
import AlertPanel from "@/components/AlertPanel";
import NetworkMesh from "@/components/NetworkMesh";
import LatencyChart from "@/components/LatencyChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { P2PMetricsProvider, useP2PMetrics } from "@/lib/P2PMetricsContext";
import { LiveKitProvider } from "@/lib/LiveKitService";

import data from "./data.json";
import { useEffect, useState } from "react";
import axios from "axios";

function DashboardContent() {
  const { latencyHistory, labels } = useP2PMetrics();
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
      <AppSidebar
        variant="inset"
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {activeView === "health" && (
                <>
                  <SectionCards />
                  <div className="px-4 lg:px-6 grid gap-6">
                    <LatencyChart labels={labels} values={latencyHistory} />
                  </div>
                </>
              )}
              <div className="px-4 lg:px-6 grid gap-6">
                {activeView === "health" && (
                  <section className="grid gap-6">
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
                )}
                {activeView === "mesh" && (
                  <section>
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
                {activeView === "tools" && (
                  <section className="grid lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Speed Test</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <SpeedTestPanel />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Alerts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <AlertPanel />
                      </CardContent>
                    </Card>
                  </section>
                )}
              </div>
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
        <DashboardContent />
      </LiveKitProvider>
    </P2PMetricsProvider>
  );
}
