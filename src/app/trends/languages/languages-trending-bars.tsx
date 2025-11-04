"use client";

import React, { useMemo, useState } from "react";
import { Category } from "@/types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { buildSeries, buildUnionLabels } from "./utils";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, ChartLegend);

type TimeRange = "all" | "1y" | "90d" | "30d" | "7d";

type TrendStat = {
  label: string;
  delta: number; // current avg - previous avg (daily active postings)
  pct: number; // relative change, 1.0 = +100%
  avgCurr: number;
  avgPrev: number;
};

export default function LanguagesTrendingBars({
  languages,
  selected,
}: {
  languages: Category[];
  selected: string[];
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const selectedLangs = useMemo(() => {
    const sel = new Set(selected.map((s) => s.toLowerCase()));
    return languages.filter((l) => sel.has(l.label.toLowerCase()));
  }, [languages, selected]);

  const seriesByLang = useMemo(() => {
    const map = new Map<string, { date: string; count: number }[]>();
    for (const lang of selectedLangs) {
      map.set(lang.label, buildSeries(lang.openings));
    }
    return map;
  }, [selectedLangs]);

  const allLabels = useMemo(() => buildUnionLabels(seriesByLang), [seriesByLang]);

  const stats: TrendStat[] = useMemo(() => {
    if (!allLabels.length) return [];
    const endIdx = allLabels.length - 1;

    let currWindow: string[];
    let prevWindow: string[];
    if (timeRange === 'all') {
      const mid = Math.floor(endIdx / 2);
      prevWindow = allLabels.slice(0, mid + 1);
      currWindow = allLabels.slice(mid + 1, endIdx + 1);
    } else {
      const windowDays = timeRange === "1y" ? 365 : timeRange === "90d" ? 90 : timeRange === "30d" ? 30 : 7;
      const currStartIdx = Math.max(0, endIdx - windowDays + 1);
      const prevEndIdx = Math.max(0, currStartIdx - 1);
      const prevStartIdx = Math.max(0, prevEndIdx - windowDays + 1);
      currWindow = allLabels.slice(currStartIdx, endIdx + 1);
      prevWindow = allLabels.slice(prevStartIdx, prevEndIdx + 1);
    }

    const toMap = (series: { date: string; count: number }[]) => new Map(series.map((r) => [r.date, r.count] as const));

    const out: TrendStat[] = [];
    for (const lang of selectedLangs) {
      const s = seriesByLang.get(lang.label) || [];
      const m = toMap(s);
      const sumCurr = currWindow.reduce((acc, d) => acc + (m.get(d) || 0), 0);
      const sumPrev = prevWindow.reduce((acc, d) => acc + (m.get(d) || 0), 0);
      const avgCurr = currWindow.length ? sumCurr / currWindow.length : 0;
      const avgPrev = prevWindow.length ? sumPrev / prevWindow.length : 0;
      const delta = avgCurr - avgPrev;
      const pct = avgPrev > 0 ? delta / avgPrev : (avgCurr > 0 ? 1 : 0);
      out.push({ label: lang.label, delta, pct, avgCurr, avgPrev });
    }
    // Sort by delta descending
    out.sort((a, b) => b.delta - a.delta);
    return out;
  }, [selectedLangs, seriesByLang, allLabels, timeRange]);

  const labels = useMemo(() => stats.map((s) => s.label), [stats]);
  const values = useMemo(() => stats.map((s) => Number(s.delta.toFixed(2))), [stats]);

  const backgroundColors = useMemo(() => values.map(v => v >= 0 ? "hsl(150 70% 45% / 0.35)" : "hsl(0 70% 50% / 0.35)"), [values]);
  const borderColors = useMemo(() => values.map(v => v >= 0 ? "hsl(150 70% 45%)" : "hsl(0 70% 50%)"), [values]);

  const data = useMemo(() => ({
    labels,
    datasets: [
      {
        label: "Trend (delta in avg daily postings)",
        data: values,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
      },
    ],
  }), [labels, values, backgroundColors, borderColors]);

  const options = useMemo(() => ({
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const i = ctx.dataIndex;
            const s = stats[i];
            const sign = s.delta >= 0 ? '+' : '';
            const pct = Math.round(s.pct * 100);
            return `${sign}${s.delta.toFixed(2)} (avg ${s.avgPrev.toFixed(2)} → ${s.avgCurr.toFixed(2)}, ${pct}%)`;
          }
        }
      },
    },
    scales: {
      x: {
        ticks: { color: "#a3a3a3" },
        grid: { color: "#404040" },
        zeroLineColor: "#6b7280",
      },
      y: { ticks: { color: "#a3a3a3" }, grid: { display: false } },
    },
  }), [stats]);

  return (
    <div className="w-full rounded-lg border border-gray-700 bg-zinc-900/40 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-gray-700/70">
        <div className="grid gap-1">
          <h3 className="text-base md:text-lg font-semibold">Trending languages (up/down)</h3>
          <p className="text-xs md:text-sm text-gray-400">Change in average daily postings vs previous window</p>
        </div>
        <div className="mt-2 sm:mt-0">
          <span className="text-xs text-gray-400 mr-2">Window</span>
          <div className="inline-flex items-center gap-1">
            {(["all","1y","90d","30d","7d"] as TimeRange[]).map(v => (
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
-                {v === "7d" ? "7 days" : v === "30d" ? "30 days" : "90 days"}
+                {v === "all" ? "All" : v === "1y" ? "1 year" : v === "90d" ? "90 days" : v === "30d" ? "30 days" : "7 days"}
               </button>
             ))}
           </div>
        </div>
      </div>
      <div className="p-2 md:p-4">
        <div className="h-[260px] md:h-[360px] w-full">
          {labels.length ? (
            <Bar data={data} options={options} />
          ) : (
            <div className="text-sm text-gray-400 px-2 py-4">No data available for the selected languages.</div>
          )}
        </div>
      </div>
    </div>
  );
}
