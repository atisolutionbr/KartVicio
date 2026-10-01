"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildEntryTrend, buildTrendChartRows, type TrendMetric } from "@/domain/timing/trend";
import type { TimingSnapshot } from "@/domain/timing/types";

const colors = ["#007f73", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

export function TimingTrendChart({
  snapshots,
  entryNumbers,
  metric = "pace",
}: {
  snapshots: TimingSnapshot[];
  entryNumbers: string[];
  metric?: TrendMetric;
}) {
  const series = entryNumbers.map((number) => ({
    number,
    points: buildEntryTrend(snapshots, number),
  }));
  const availableSeries = series.filter((item) => item.points.length > 0);
  const missingNumbers = series.filter((item) => item.points.length === 0).map((item) => item.number);
  const data = buildTrendChartRows(
    snapshots,
    availableSeries.map((item) => item.number),
    metric,
  );

  if (availableSeries.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center border border-dashed border-border bg-background text-sm text-muted-foreground">
        Aguardando as primeiras voltas dos karts selecionados
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="h-80 w-full rounded-md border border-border bg-white px-1 pb-1 pt-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 18, left: 10, bottom: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#dce3ea" />
          <XAxis
            dataKey="lap"
            type="category"
            tickFormatter={(value) => `V${Math.round(Number(value))}`}
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
            tick={{ fontSize: 11, fill: "#64748b" }}
            minTickGap={28}
          />
          <YAxis
            domain={metric === "position" ? ["dataMin", "dataMax"] : ["auto", "auto"]}
            reversed={metric === "position"}
            allowDecimals={metric !== "position"}
            tickFormatter={(value) => axisValue(Number(value), metric)}
            tickLine={false}
            axisLine={false}
            width={66}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickMargin={8}
          />
          <Tooltip
            cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }}
            contentStyle={{ borderRadius: 6, borderColor: "#cbd5e1", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)" }}
            formatter={(value, name) => [formatMetricValue(Number(value), metric), `Kart ${name}`]}
            labelFormatter={(label) => `Volta ${label}`}
          />
          <Legend iconType="plainline" iconSize={18} wrapperStyle={{ fontSize: 12, paddingTop: 10 }} formatter={(value) => `Kart ${value}`} />
          {availableSeries.map(({ number }, index) => (
            <Line
              key={number}
              type="monotone"
              dataKey={number}
              stroke={colors[index % colors.length]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      </div>
      {missingNumbers.length > 0 && (
        <div className="mt-2 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Sem leitura para: {missingNumbers.map((number) => `#${number}`).join(", ")}
        </div>
      )}
    </div>
  );
}

function formatMetricValue(value: number, metric: TrendMetric) {
  if (metric === "position") return `P${Math.round(value)}`;
  if (metric === "pace") return formatLapTime(value, 3);
  return `${value.toFixed(3)}s`;
}

function axisValue(value: number, metric: TrendMetric) {
  if (metric === "position") return `P${Math.round(value)}`;
  if (metric === "pace") return formatLapTime(value, 1);
  return `${value.toFixed(1)}s`;
}

function formatLapTime(ms: number, decimals: number) {
  const minutes = Math.floor(ms / 60_000);
  const seconds = (ms % 60_000) / 1_000;
  return `${minutes}:${seconds.toFixed(decimals).padStart(decimals + 3, "0")}`;
}
