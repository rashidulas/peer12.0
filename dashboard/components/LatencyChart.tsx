"use client";

import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import { Activity, Zap, TrendingUp, TrendingDown } from "lucide-react";

type Props = {
  labels: string[];
  values: number[];
};

export default function LatencyChart({ labels, values }: Props) {
  // Combine labels and values into one array of objects for Recharts
  const data = labels.map((label, index) => ({
    name: label,
    latency: values[index] || 0,
  }));

  // Calculate stats - filter out zeros
  const validValues = values.filter((v) => v > 0);
  const hasData = validValues.length > 0;
  const currentLatency = validValues[validValues.length - 1] || 0;
  const previousLatency = validValues[validValues.length - 2] || 0;
  const avgLatency = hasData
    ? validValues.reduce((a, b) => a + b, 0) / validValues.length
    : 0;
  const maxLatency = hasData ? Math.max(...validValues) : 0;
  const minLatency = hasData ? Math.min(...validValues) : 0;
  // Stabilize Y-axis so the graph doesn't jump on new points
  const yMax = Math.max(300, Math.ceil(maxLatency / 50) * 50 + 50);

  const trend =
    currentLatency > previousLatency
      ? "up"
      : currentLatency < previousLatency
      ? "down"
      : "stable";

  const status =
    currentLatency >= 300
      ? "critical"
      : currentLatency >= 150
      ? "warning"
      : currentLatency >= 100
      ? "fair"
      : "excellent";

  const statusConfig = {
    excellent: {
      label: "Excellent",
      bgColor: "bg-emerald-500",
      chartColor: "#10b981",
    },
    fair: {
      label: "Fair",
      bgColor: "bg-blue-500",
      chartColor: "#06b6d4",
    },
    warning: {
      label: "Degraded",
      bgColor: "bg-amber-500",
      chartColor: "#f59e0b",
    },
    critical: {
      label: "Critical",
      bgColor: "bg-red-500",
      chartColor: "#ef4444",
    },
  };

  const currentStatus = statusConfig[status];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const tooltipStatus =
        value >= 300
          ? "critical"
          : value >= 150
          ? "warning"
          : value >= 100
          ? "fair"
          : "excellent";
      const tooltipColor = statusConfig[tooltipStatus].chartColor;

      return (
        <div className="bg-white/95 backdrop-blur-md border-2 shadow-xl rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">
            {payload[0].payload.name}
          </p>
          <p className="text-2xl font-bold" style={{ color: tooltipColor }}>
            {value.toFixed(1)}
            <span className="text-sm ml-1">ms</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="text-4xl font-bold text-gray-900">
              {hasData ? currentLatency.toFixed(1) : "--"}
              <span className="text-lg text-gray-500 ml-1">ms</span>
            </div>
            {hasData && trend === "up" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-md text-sm font-medium">
                <TrendingUp className="w-3 h-3" />+
                {(currentLatency - previousLatency).toFixed(1)}ms
              </span>
            )}
            {hasData && trend === "down" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md text-sm font-medium">
                <TrendingDown className="w-3 h-3" />-
                {(previousLatency - currentLatency).toFixed(1)}ms
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">Current latency</p>
        </div>

        <div
          className={`px-4 py-3 rounded-lg border ${currentStatus.bgColor
            .replace("bg-", "bg-")
            .replace("-500", "-50")} border-${currentStatus.bgColor
            .replace("bg-", "")
            .replace("-500", "-200")}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-2 h-2 ${currentStatus.bgColor} rounded-full`}
            ></div>
            <span
              className={`font-semibold ${currentStatus.bgColor
                .replace("bg-", "text-")
                .replace("-500", "-700")}`}
            >
              {currentStatus.label}
            </span>
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            {hasData && (
              <>
                <div className="flex justify-between gap-4">
                  <span>Avg:</span>
                  <span className="font-medium">{avgLatency.toFixed(1)}ms</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Min:</span>
                  <span className="font-medium text-green-600">
                    {minLatency.toFixed(1)}ms
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Max:</span>
                  <span className="font-medium text-red-600">
                    {maxLatency.toFixed(1)}ms
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={currentStatus.chartColor}
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor={currentStatus.chartColor}
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#cbd5e1"
              vertical={false}
              opacity={0.6}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickMargin={12}
              axisLine={{ stroke: "#cbd5e1" }}
            />
            <YAxis
              domain={[0, yMax]}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickMargin={12}
              axisLine={{ stroke: "#cbd5e1" }}
              label={{
                value: "Latency (ms)",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 12, fill: "#64748b", fontWeight: 600 },
              }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: currentStatus.chartColor, strokeWidth: 2 }}
            />
            <ReferenceLine
              y={150}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              opacity={0.7}
              label={{
                value: "Warning",
                position: "right",
                fill: "#f59e0b",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <ReferenceLine
              y={300}
              stroke="#ef4444"
              strokeDasharray="5 5"
              opacity={0.7}
              label={{
                value: "Critical",
                position: "right",
                fill: "#ef4444",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <Area
              type="linear"
              dataKey="latency"
              fill="url(#latencyGradient)"
              stroke="none"
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="latency"
              stroke={currentStatus.chartColor}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={{
                r: 4,
                fill: currentStatus.chartColor,
                strokeWidth: 2,
                stroke: "#fff",
              }}
              activeDot={{
                r: 7,
                fill: currentStatus.chartColor,
                strokeWidth: 3,
                stroke: "#fff",
                filter: "drop-shadow(0 0 6px rgba(0,0,0,0.3))",
              }}
              isAnimationActive={false}
              animationDuration={0}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
