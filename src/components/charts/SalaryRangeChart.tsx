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

interface SalaryRangeChartProps {
  min: number;
  avg: number;
  median: number;
  max: number;
}

export default function SalaryRangeChart({ min, avg, median, max }: SalaryRangeChartProps) {
  const data = useMemo(
    () => ({
      labels: ["Minimi", "Keskiarvo", "Mediaani", "Maksimi"],
      datasets: [
        {
          data: [min, avg, median, max],
          backgroundColor: [
            "hsl(0 70% 55% / 0.35)",
            "hsl(45 70% 55% / 0.35)",
            "hsl(142 70% 55% / 0.35)",
            "hsl(200 70% 55% / 0.35)",
          ],
          borderColor: [
            "hsl(0 70% 55%)",
            "hsl(45 70% 55%)",
            "hsl(142 70% 55%)",
            "hsl(200 70% 55%)",
          ],
          borderWidth: 1,
        },
      ],
    }),
    [min, avg, median, max],
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
            label: (ctx: any) => `${Number(ctx.parsed.x).toLocaleString("fi-FI")} €/kk`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: "#a3a3a3",
            callback: (val: any) => `${Number(val).toLocaleString("fi-FI")}€`,
          },
          grid: { color: "#404040" },
        },
        y: { ticks: { color: "#a3a3a3" }, grid: { display: false } },
      },
    }),
    [],
  );

  return (
    <div className="h-[180px] w-full">
      <Bar data={data} options={options} />
    </div>
  );
}
