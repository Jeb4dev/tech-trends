"use client";

import React, { useMemo, useState } from "react";
import { Category } from "@/types";
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
import { buildSeries, buildUnionLabels, colorForIndex, parseYmd, addDays, formatYmd } from "./utils";

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

type TimeRange = "all" | "90d" | "30d" | "7d";

export default function LanguagesStackedShareChart({
  languages,
  selected,
}: {
  languages: Category[];
  selected: string[];
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>("90d");

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

  const fullLabels = useMemo(() => buildUnionLabels(seriesByLang), [seriesByLang]);
  const filteredLabels = useMemo(() => {
    if (!fullLabels.length) return fullLabels;
    if (timeRange === "all") return fullLabels;
    const end = fullLabels[fullLabels.length - 1];
    const endDate = parseYmd(end);
    const windowDays = timeRange === "90d" ? 90 : timeRange === "30d" ? 30 : 7;
    const startDate = addDays(endDate, -windowDays + 1);
    const startYmd = formatYmd(startDate);
    return fullLabels.filter((d) => d >= startYmd);
  }, [fullLabels, timeRange]);

  const stackedDatasets = useMemo(() => {
    // build share per day: count(lang)/sum(all selected)
    const countsByLang = new Map(
      Array.from(seriesByLang.entries()).map(([label, series]) => [label, new Map(series.map((r) => [r.date, r.count]))])
    );
    const totalsByDate = new Map<string, number>();
    for (const d of filteredLabels) {
      let total = 0;
      for (const [, m] of countsByLang) total += m.get(d) || 0;
      totalsByDate.set(d, total || 1); // avoid division by zero
    }
    return selectedLangs.map((lang, idx) => {
      const color = colorForIndex(idx);
      const m = countsByLang.get(lang.label) || new Map<string, number>();
      const data = filteredLabels.map((d) => ((m.get(d) || 0) / (totalsByDate.get(d) || 1)) * 100);
      return {
        label: lang.label,
        data,
        borderColor: color,
        backgroundColor: color.replace(
          /^hsl\((\d+)\s+(\d+)%\s+(\d+)%\)$/, (m, h, s, l) => `hsl(${h} ${s}% ${l}% / 0.18)`
        ),
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        stack: 'share',
      };
    });
  }, [selectedLangs, seriesByLang, filteredLabels]);

  const chartData = useMemo(() => ({ labels: filteredLabels, datasets: stackedDatasets }), [filteredLabels, stackedDatasets]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" as const },
    plugins: {
      legend: { display: true, labels: { color: "#d4d4d4" } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${ctx.formattedValue}%`,
        },
        enabled: true,
        backgroundColor: "#111827",
        titleColor: "#e5e7eb",
        bodyColor: "#e5e7eb",
        borderColor: "#374151",
        borderWidth: 1,
        displayColors: true,
      },
    },
    scales: {
      x: { ticks: { color: "#a3a3a3", maxRotation: 0, autoSkipPadding: 12 }, grid: { display: false } },
      y: { beginAtZero: true, max: 100, ticks: { color: "#a3a3a3", callback: (v: any) => v + '%' }, grid: { color: "#404040" } },
    },
  }), []);

  return (
    <div className="w-full rounded-lg border border-gray-700 bg-zinc-900/40 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-gray-700/70">
        <div className="grid gap-1">
          <h3 className="text-base md:text-lg font-semibold">Language share over time</h3>
          <p className="text-xs md:text-sm text-gray-400">Percentage share of daily active postings among selected languages</p>
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
        <div className="h-[280px] md:h-[360px] w-full">
          <Line data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}

