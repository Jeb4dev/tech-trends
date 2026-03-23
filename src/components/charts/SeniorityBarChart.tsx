"use client";

import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip);

const LEVEL_LABELS: Record<string, string> = {
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  lead: "Lead / Principal",
  unspecified: "Ei ilmoitettu",
};

interface SeniorityBarChartProps {
  data: { level: string; count: number }[];
}

export default function SeniorityBarChart({ data }: SeniorityBarChartProps) {
  const chartData = useMemo(
    () => ({
      labels: data.map((d) => LEVEL_LABELS[d.level] || d.level),
      datasets: [
        {
          data: data.map((d) => d.count),
          backgroundColor: "hsl(142 70% 55% / 0.35)",
          borderColor: "hsl(142 70% 55%)",
          borderWidth: 1,
        },
      ],
    }),
    [data],
  );

  const options = useMemo(
    () => ({
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => `${ctx.parsed.x} työpaikkaa`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: "#a3a3a3" },
          grid: { color: "#404040" },
        },
        y: { ticks: { color: "#a3a3a3" }, grid: { display: false } },
      },
    }),
    [],
  );

  if (!data.length) return null;

  return (
    <div className="h-[180px] w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}
