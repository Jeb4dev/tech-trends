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
import { extractSalaryRaw } from "@/salary";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, ChartLegend);

type LangSalaryStat = {
  label: string;
  avg: number; // average estimated monthly €
  count: number; // postings with parsed salary
};

function estimatePostingMonthly(text: string): number | null {
  const s = extractSalaryRaw(text);
  if (!s) return null;
  if (s.min != null && s.max != null) return (s.min + s.max) / 2;
  if (s.min != null) return s.min;
  if (s.max != null) return s.max;
  return null;
}

export default function LanguagesSalaryBars({
  languages,
  selected,
}: {
  languages: Category[];
  selected: string[];
}) {
  const sel = useMemo(() => new Set(selected.map((s) => s.toLowerCase())), [selected]);
  const chosen = useMemo(() => languages.filter((l) => sel.has(l.label.toLowerCase())), [languages, sel]);

  const stats: LangSalaryStat[] = useMemo(() => {
    const out: LangSalaryStat[] = [];
    for (const lang of chosen) {
      let sum = 0;
      let n = 0;
      for (const o of lang.openings) {
        const val = estimatePostingMonthly((o.heading || "") + "\n" + (o.descr || ""));
        if (val != null) { sum += val; n++; }
      }
      if (n > 0) out.push({ label: lang.label, avg: sum / n, count: n });
    }
    // Sort by descending average
    out.sort((a, b) => b.avg - a.avg);
    return out;
  }, [chosen]);

  const labels = useMemo(() => stats.map((s) => s.label), [stats]);
  const dataValues = useMemo(() => stats.map((s) => Math.round(s.avg)), [stats]);
  const counts = useMemo(() => stats.map((s) => s.count), [stats]);

  const data = useMemo(() => ({
    labels,
    datasets: [
      {
        label: "Avg monthly salary (estimated, €)",
        data: dataValues,
        backgroundColor: labels.map((_, i) => colorForIndex(i).replace(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/, (m,h,s,l)=>`hsl(${h} ${s}% ${l}% / 0.35)`)),
        borderColor: labels.map((_, i) => colorForIndex(i)),
        borderWidth: 1,
      },
    ],
  }), [labels, dataValues]);

  const options = useMemo(() => ({
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const idx = ctx.dataIndex;
            const v = ctx.parsed.x;
            const c = counts[idx] || 0;
            return `Avg: ${v.toLocaleString('fi-FI')}€ (n=${c})`;
          }
        }
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          color: "#a3a3a3",
          callback: (val: any) => `${Number(val).toLocaleString('fi-FI')}€`
        },
        grid: { color: "#404040" },
      },
      y: { ticks: { color: "#a3a3a3" }, grid: { display: false } },
    },
  }), [counts]);

  return (
    <div className="w-full rounded-lg border border-gray-700 bg-zinc-900/40 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-700/70">
        <h3 className="text-base md:text-lg font-semibold">Highest paying languages (avg monthly €)</h3>
        <p className="text-xs text-gray-400 mt-1">Includes only postings where a monthly salary figure was detected.</p>
      </div>
      <div className="p-2 md:p-4">
        <div className="h-[260px] md:h-[360px] w-full">
          {labels.length ? (
            <Bar data={data} options={options} />
          ) : (
            <div className="text-sm text-gray-400 px-2 py-4">No salary information detected for the selected languages.</div>
          )}
        </div>
      </div>
    </div>
  );
}

