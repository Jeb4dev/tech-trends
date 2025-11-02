"use client";

import React, { useMemo, useRef, useState } from "react";
import type { Results } from "@/types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
  TimeSeriesScale,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Start all charts from this date (inclusive)
const SERIES_MIN_START = "2025-09-01";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTooltip,
  ChartLegend,
  Filler,
  TimeSeriesScale
);

function toDateOnly(str: string | undefined | null): string | null {
  if (!str) return null;
  const m = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map((v) => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

type TimeRange = "all" | "90d" | "30d" | "7d";

export function ActiveOpeningsAreaChart({ openings }: { openings: Results[] }) {
  const [timeRange, setTimeRange] = useState<TimeRange>("90d");
  const canvasRef = useRef<any>(null);

  const dataSeries = useMemo(() => {
    if (!openings || openings.length === 0) return [] as { date: string; count: number }[];

    let minYmd: string | null = null;
    let maxYmd: string | null = null;

    for (const o of openings) {
      const start = toDateOnly(o.date_posted);
      const end = toDateOnly(o.last_seen_at || o.date_posted);
      if (start) {
        if (!minYmd || start < minYmd) minYmd = start;
        if (!maxYmd || start > maxYmd) maxYmd = start;
      }
      if (end) {
        if (!maxYmd || end > maxYmd) maxYmd = end;
      }
    }

    if (!minYmd) return [];
    if (!maxYmd) maxYmd = formatYmd(new Date());

    // Clamp series start to SERIES_MIN_START
    const startYmd = minYmd < SERIES_MIN_START ? SERIES_MIN_START : minYmd;
    if (maxYmd < SERIES_MIN_START) return [];

    const startDate = parseYmd(startYmd);
    const endDate = parseYmd(maxYmd);

    // Build diff map (+1 at start, -1 at end+1)
    const diff = new Map<string, number>();
    const inc = (ymd: string, delta: number) => diff.set(ymd, (diff.get(ymd) || 0) + delta);

    for (const o of openings) {
      const s = toDateOnly(o.date_posted);
      const e0 = toDateOnly(o.last_seen_at || o.date_posted);
      if (!s) continue;
      const e = e0 && e0 >= s ? e0 : s; // ensure end >= start
      inc(s, +1);
      const ePlus = formatYmd(addDays(parseYmd(e), 1));
      inc(ePlus, -1);
    }

    // Initial running count at startYmd = jobs active on that day
    let running = 0;
    for (const o of openings) {
      const s = toDateOnly(o.date_posted);
      const e0 = toDateOnly(o.last_seen_at || o.date_posted);
      if (!s) continue;
      const e = e0 && e0 >= s ? e0 : s;
      if (s <= startYmd && e >= startYmd) running++;
    }

    const series: { date: string; count: number }[] = [];
    let first = true;
    for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
      const ymd = formatYmd(d);
      if (!first) running += diff.get(ymd) || 0; // apply day-to-day changes
      series.push({ date: ymd, count: running });
      first = false;
    }

    return series;
  }, [openings]);

  const filtered = useMemo(() => {
    if (!dataSeries.length) return dataSeries;
    if (timeRange === "all") return dataSeries;
    const end = dataSeries[dataSeries.length - 1]?.date;
    if (!end) return dataSeries;
    const endDate = parseYmd(end);
    const windowDays = timeRange === "90d" ? 90 : timeRange === "30d" ? 30 : 7;
    const startDate = addDays(endDate, -windowDays + 1);
    const startYmd = formatYmd(startDate);
    return dataSeries.filter((row) => row.date >= startYmd);
  }, [dataSeries, timeRange]);

  const chartData = useMemo(() => {
    const labels = filtered.map((r) => r.date);
    return {
      labels,
      datasets: [
        {
          label: "Active postings",
          data: filtered.map((r) => r.count),
          borderColor: "#22c55e",
          backgroundColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return "rgba(34,197,94,0.2)";
            const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, "rgba(34,197,94,0.6)");
            gradient.addColorStop(1, "rgba(34,197,94,0.05)");
            return gradient;
          },
          fill: true,
          tension: 0.35,
          pointRadius: 0,
        },
      ],
    };
  }, [filtered]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" as const },
    plugins: {
      legend: { display: true, labels: { color: "#d4d4d4" } },
      tooltip: {
        enabled: true,
        backgroundColor: "#111827",
        titleColor: "#e5e7eb",
        bodyColor: "#e5e7eb",
        borderColor: "#374151",
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          title: (items: any[]) => items[0] && new Date(items[0].label + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#a3a3a3",
          maxRotation: 0,
          autoSkipPadding: 12,
          callback: (val: any, idx: number) => {
            const label = (chartData.labels as string[])[idx];
            const d = new Date(label + "T00:00:00");
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          },
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#a3a3a3" },
        grid: { color: "#404040" },
      },
    },
  }), [chartData.labels]);

  return (
    <div className="w-full rounded-lg border border-gray-700 bg-zinc-900/40 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-gray-700/70">
        <div className="grid gap-1">
          <h3 className="text-base md:text-lg font-semibold">Active postings over time</h3>
          <p className="text-xs md:text-sm text-gray-400">Count of filtered postings active between date posted and last seen</p>
        </div>
        <div className="mt-2 sm:mt-0">
          <span className="text-xs text-gray-400 mr-2">Range</span>
          <div className="inline-flex items-center gap-1">
            {(["90d","30d","7d","all"] as TimeRange[]).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setTimeRange(v)}
                className={
                  "px-2.5 py-1 text-xs sm:text-sm rounded-md border transition-colors " +
                  (timeRange === v
                    ? "border-green-500 bg-green-500/15 text-green-300 hover:bg-green-500/25"
                    : "border-gray-600 bg-transparent text-gray-200 hover:bg-gray-800/60")
                }
                aria-pressed={timeRange === v}
              >
                {v === "90d" ? "Last 90 days" : v === "30d" ? "Last 30 days" : v === "7d" ? "Last 7 days" : "All"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-2 md:p-4">
        <div className="h-[240px] md:h-[300px] w-full">
          <Line ref={canvasRef} data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}

export default ActiveOpeningsAreaChart;
