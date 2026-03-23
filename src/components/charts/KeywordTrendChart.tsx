"use client";

import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTooltip, Filler);

interface KeywordTrendChartProps {
  data: { date: string; count: number }[];
  keywordName: string;
}

export default function KeywordTrendChart({ data, keywordName }: KeywordTrendChartProps) {
  const labels = useMemo(() => data.map((d) => d.date), [data]);
  const values = useMemo(() => data.map((d) => d.count), [data]);

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: keywordName,
          data: values,
          borderColor: "hsl(142 70% 55%)",
          backgroundColor: "hsl(142 70% 55% / 0.15)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    }),
    [labels, values, keywordName],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" as const },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#111827",
          titleColor: "#e5e7eb",
          bodyColor: "#e5e7eb",
          borderColor: "#374151",
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { color: "#a3a3a3", maxRotation: 0, autoSkipPadding: 16 },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#a3a3a3" },
          grid: { color: "#404040" },
        },
      },
    }),
    [],
  );

  if (!data.length) {
    return <p className="text-sm text-gray-500">Ei trendidataa saatavilla.</p>;
  }

  return (
    <div className="w-full rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-700/30">
        <h2 className="text-base font-semibold text-white">{keywordName} — kysyntätrendi</h2>
        <p className="text-xs text-gray-500 mt-0.5">Päivittäiset aktiiviset ilmoitukset (90 pv)</p>
      </div>
      <div className="p-4">
        <div className="h-[260px] md:h-[320px] w-full">
          <Line data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}
