"use client";

import React, { useMemo } from "react";
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
import { colorForIndex } from "./utils";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, ChartLegend);

interface ToplineBarsProps {
  items: Category[];
  selected: string[];
  categoryLabel: string;
}

export default function ToplineBars({ items, selected, categoryLabel }: ToplineBarsProps) {
  const sel = useMemo(() => new Set(selected.map((s) => s.toLowerCase())), [selected]);
  const chosen = useMemo(() => items.filter((l) => sel.has(l.label.toLowerCase())), [items, sel]);

  const labels = useMemo(() => chosen.map((c) => c.label), [chosen]);
  const dataCounts = useMemo(() => chosen.map((c) => c.openings.length || 0), [chosen]);

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Openings count (total)",
          data: dataCounts,
          backgroundColor: labels.map((_, i) =>
            colorForIndex(i).replace(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/, (_m, h, s, l) => `hsl(${h} ${s}% ${l}% / 0.35)`),
          ),
          borderColor: labels.map((_, i) => colorForIndex(i)),
          borderWidth: 1,
        },
      ],
    }),
    [labels, dataCounts],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
      scales: {
        x: { ticks: { color: "#a3a3a3" }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: "#a3a3a3" }, grid: { color: "#404040" } },
      },
    }),
    [],
  );

  return (
    <div className="w-full rounded-lg border border-gray-700 bg-zinc-900/40 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-700/70">
        <h3 className="text-base md:text-lg font-semibold">Total openings per {categoryLabel.toLowerCase()} (selected)</h3>
      </div>
      <div className="p-2 md:p-4">
        <div className="h-[260px] md:h-[320px] w-full">
          <Bar data={data} options={options} />
        </div>
      </div>
    </div>
  );
}
