"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface P2PMetrics {
  latency: number;
  packetLoss: number;
  timestamp: number;
}

interface P2PMetricsContextType {
  latencyHistory: number[];
  labels: string[];
  currentLatency: number;
  currentPacketLoss: number;
  addMetric: (latency: number, packetLoss: number) => void;
}

const P2PMetricsContext = createContext<P2PMetricsContextType | undefined>(
  undefined
);

export function P2PMetricsProvider({ children }: { children: ReactNode }) {
  const [metrics, setMetrics] = useState<P2PMetrics[]>([]);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize with a placeholder if no metrics after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (metrics.length === 0 && !initialized) {
        const now = Date.now();
        setLatencyHistory([0]);
        setLabels([new Date(now).toLocaleTimeString()]);
        setInitialized(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [metrics.length, initialized]);

  const addMetric = (latency: number, packetLoss: number) => {
    const timestamp = Date.now();
    const newMetric: P2PMetrics = { latency, packetLoss, timestamp };

    if (!initialized) setInitialized(true);

    setMetrics((prev) => {
      const updated = [...prev, newMetric].slice(-20); // Keep last 20 metrics
      return updated;
    });

    setLatencyHistory((prev) => [...prev.slice(-19), latency]);
    setLabels((prev) => [
      ...prev.slice(-19),
      new Date(timestamp).toLocaleTimeString(),
    ]);
  };

  const currentLatency =
    metrics.length > 0 ? metrics[metrics.length - 1].latency : 0;
  const currentPacketLoss =
    metrics.length > 0 ? metrics[metrics.length - 1].packetLoss : 0;

  return (
    <P2PMetricsContext.Provider
      value={{
        latencyHistory,
        labels,
        currentLatency,
        currentPacketLoss,
        addMetric,
      }}
    >
      {children}
    </P2PMetricsContext.Provider>
  );
}

export function useP2PMetrics() {
  const context = useContext(P2PMetricsContext);
  if (context === undefined) {
    throw new Error("useP2PMetrics must be used within a P2PMetricsProvider");
  }
  return context;
}
