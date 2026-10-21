"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#2563eb", "#d97706", "#059669", "#9333ea", "#dc2626", "#0891b2", "#65a30d"];

export function MeasurementChart({
  rows, dims,
}: { rows: Record<string, unknown>[]; dims: readonly string[] }) {
  const active = dims.filter((d) => rows.some((r) => r[d] != null));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="measuredOn" tick={{ fontSize: 11 }} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
          <Legend />
          {active.map((d, i) => (
            <Line key={d} dataKey={d} stroke={COLORS[i % COLORS.length]} connectNulls dot />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
