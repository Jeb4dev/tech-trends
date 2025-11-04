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

export default function LanguagesPopularityChart({
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

  const datasets = useMemo(() => {
    return selectedLangs.map((lang, idx) => {
      const series = seriesByLang.get(lang.label) || [];
      const dataByDate = new Map(series.map((r) => [r.date, r.count] as const));
      const border = colorForIndex(idx);
      return {
        label: lang.label,
        data: filteredLabels.map((d) => dataByDate.get(d) || 0),
        borderColor: border,
        backgroundColor: border.replace(
          /^hsl\((\d+)\s+(\d+)%\s+(\d+)%\)$/, // to rgba-like via hsl -> hsla string
          (m, h, s, l) => `hsl(${h} ${s}% ${l}% / 0.18)`
        ),
        fill: true,
        tension: 0.35,
        pointRadius: 0,
      };
    });
  }, [selectedLangs, seriesByLang, filteredLabels]);

  const chartData = useMemo(
    () => ({ labels: filteredLabels, datasets }),
    [filteredLabels, datasets]
  );

  const options = useMemo(
    () => ({
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
          displayColors: true,
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#a3a3a3",
            maxRotation: 0,
            autoSkipPadding: 12,
          },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#a3a3a3" },
          grid: { color: "#404040" },
        },
      },
    }),
    []
  );

  return (
    <div className="w-full rounded-lg border border-gray-700 bg-zinc-900/40 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-gray-700/70">
        <div className="grid gap-1">
          <h3 className="text-base md:text-lg font-semibold">Language popularity over time</h3>
          <p className="text-xs md:text-sm text-gray-400">Daily active postings mentioning the language</p>
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
