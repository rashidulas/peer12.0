"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

type Props = {
  labels: string[];
  values: number[];
};

export default function LatencyChart({ labels, values }: Props) {
  // Combine labels and values into one array of objects for Recharts
  const data = labels.map((label, index) => ({
    name: label,
    latency: values[index],
  }));

  return (
    <div className="w-full h-64 min-h-[250px] bg-white rounded-xl shadow-sm p-4 border border-gray-100">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, "auto"]} tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#06b6d4"
            strokeWidth={3}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
            name="Avg Latency (ms)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
