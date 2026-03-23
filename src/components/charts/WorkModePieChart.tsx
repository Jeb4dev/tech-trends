"use client";

import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, ChartTooltip, ChartLegend);

const MODE_LABELS: Record<string, string> = {
  remote: "Etätyö",
  hybrid: "Hybridi",
  onsite: "Toimisto",
  unknown: "Ei ilmoitettu",
};

const MODE_COLORS: Record<string, string> = {
  remote: "hsl(142 70% 55%)",
  hybrid: "hsl(45 70% 55%)",
  onsite: "hsl(200 70% 55%)",
  unknown: "hsl(0 0% 45%)",
};

interface WorkModePieChartProps {
  data: { mode: string; count: number }[];
}

export default function WorkModePieChart({ data }: WorkModePieChartProps) {
  const chartData = useMemo(
    () => ({
      labels: data.map((d) => MODE_LABELS[d.mode] || d.mode),
      datasets: [
        {
          data: data.map((d) => d.count),
          backgroundColor: data.map((d) =>
            (MODE_COLORS[d.mode] || "hsl(0 0% 45%)").replace(")", " / 0.6)"),
          ),
          borderColor: data.map((d) => MODE_COLORS[d.mode] || "hsl(0 0% 45%)"),
          borderWidth: 1,
        },
      ],
    }),
    [data],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right" as const,
          labels: { color: "#d4d4d4", padding: 16, font: { size: 12 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(0) : 0;
              return `${ctx.label}: ${ctx.parsed} (${pct} %)`;
            },
          },
        },
      },
    }),
    [],
  );

  if (!data.length) return null;

  return (
    <div className="h-[220px] w-full">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
