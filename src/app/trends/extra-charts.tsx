"use client";

import React, { useMemo, useState } from "react";
import type { Results } from "@/types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import { classifyWorkMode } from "@/workMode";
import { extractSalaryRaw } from "@/salary";
import { computeBase } from "@/compute";

const SERIES_MIN_START = "2025-09-01"; // align with main chart

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  ChartTooltip,
  ChartLegend,
  Filler
);

function toDateOnly(str?: string | null): string | null {
  if (!str) return null;
  const m = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}
function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(x.getDate() + days); return x; }
function formatYmd(d: Date) { const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
function parseYmd(s: string) { const [y,m,d]=s.split("-").map(n=>parseInt(n,10)); return new Date(y,(m||1)-1,d||1); }
const mean = (arr: number[]) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
const median = (arr: number[]) => { if (!arr.length) return 0; const a=[...arr].sort((a,b)=>a-b); const mid=Math.floor(a.length/2); return a.length%2? a[mid] : (a[mid-1]+a[mid])/2; };
const AGE_LABELS = ["1–3","4–7","8–14","15–30","31–60","61–90","91+"] as const;

function weekStartYmd(ymd: string): string {
  const d = parseYmd(ymd);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  const dd = new Date(d);
  dd.setDate(dd.getDate() + diff);
  return formatYmd(dd);
}

export default function ExtraCharts({ openings }: { openings: Results[] }) {
  const [period, setPeriod] = useState<"daily" | "weekly">("weekly");
  const {
    newSeries,
    lastSeenSeries,
    workModeCounts,
    topCities,
    topCompanies,
    salaryMentioned,
    salaryMissing,
    salaryAvgSeries,
    salaryMedSeries,
    weekdayCounts,
    ageStats,
    ageHistogram,
    weeklyNew,
    weeklyLast,
    weeklySalary,
    ageExactLabels,
    ageExactCounts,
    trendUp,
    trendDown,
    wmTrends,
  } = useMemo(() => {
    // --- time series: posted and last seen per day
    const postedMap = new Map<string, number>();
    const lastSeenMap = new Map<string, number>();
    let max: string | null = null;

    // --- salary per-day numeric arrays
    const salaryByDate = new Map<string, number[]>();
    let salaryMentioned = 0;

    // --- weekday counts (Mon..Sun)
    const weekdayCounts = Array(7).fill(0) as number[]; // JS getDay: 0=Sun..6=Sat

    // --- age list for stats (deleted postings only)
    const ages: number[] = [];
    const agesExact: number[] = [];

    // Today (local) date-only string used to decide if posting is still active
    const todayYmd = formatYmd(new Date());

    // Precompute slug -> weekStart for efficient weekly label counts
    const slugToWeek = new Map<string, string>();

    for (const o of openings) {
      const p = toDateOnly(o.date_posted);
      const ls = toDateOnly(o.last_seen_at || o.date_posted);

      if (p) {
        postedMap.set(p, (postedMap.get(p) || 0) + 1);
        const pd = parseYmd(p);
        const jsDay = pd.getDay(); // 0..6, Sun..Sat
        const monIndex = (jsDay + 6) % 7; // 0=Mon..6=Sun
        weekdayCounts[monIndex]++;
        const ws = weekStartYmd(p);
        if (o.slug) slugToWeek.set(o.slug, ws);
        if (!max || p > max) max = p;
      }
      if (ls) {
        lastSeenMap.set(ls, (lastSeenMap.get(ls) || 0) + 1);
        if (!max || ls > max) max = ls;
      }

      // Salary parse
      const s = extractSalaryRaw((o.heading || "") + "\n" + (o.descr || ""));
      if (s) {
        salaryMentioned++;
        const v = s.min !== undefined && s.max !== undefined ? (s.min + s.max) / 2 : s.min !== undefined ? s.min : null;
        if (v && p) {
          const arr = salaryByDate.get(p) || [];
          arr.push(v);
          salaryByDate.set(p, arr);
        }
      }

      // Age in days (only for postings no longer active today)
      if (p && ls && ls < todayYmd) {
        const diffDays = Math.round((parseYmd(ls).getTime() - parseYmd(p).getTime()) / (24*3600*1000));
        const daysInclusive = Math.max(1, diffDays + 1);
        ages.push(daysInclusive);
        agesExact.push(Math.max(0, diffDays));
      }
    }

    if (!max) max = formatYmd(new Date());
    if (max < SERIES_MIN_START) {
      return {
        newSeries: [], lastSeenSeries: [], workModeCounts: new Map(), topCities: [], topCompanies: [],
        salaryMentioned, salaryMissing: openings.length - salaryMentioned,
        salaryAvgSeries: [], salaryMedSeries: [], weekdayCounts, ageStats: { avg: 0, median: 0 }, ageHistogram: { labels: [...AGE_LABELS], counts: Array(AGE_LABELS.length).fill(0) },
        weeklyNew: [], weeklyLast: [], weeklySalary: [],
      };
    }

    const start = parseYmd(SERIES_MIN_START);
    const end = parseYmd(max);
    const newSeries: { date: string; count: number }[] = [];
    const lastSeenSeries: { date: string; count: number }[] = [];
    const salaryAvgSeries: { date: string; value: number }[] = [];
    const salaryMedSeries: { date: string; value: number }[] = [];

    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const ymd = formatYmd(d);
      newSeries.push({ date: ymd, count: postedMap.get(ymd) || 0 });
      lastSeenSeries.push({ date: ymd, count: lastSeenMap.get(ymd) || 0 });
      const arr = salaryByDate.get(ymd) || [];
      salaryAvgSeries.push({ date: ymd, value: arr.length ? Math.round(mean(arr)) : 0 });
      salaryMedSeries.push({ date: ymd, value: arr.length ? Math.round(median(arr)) : 0 });
    }

    // Build weekly aggregates aligned to week starts
    const weekStarts: string[] = (() => {
      const arr: string[] = [];
      let ws = parseYmd(weekStartYmd(formatYmd(start)));
      for (let d = ws; d <= end; d = addDays(d, 7)) arr.push(formatYmd(d));
      return arr;
    })();
    const aggregateWeeklyCounts = (series: { date: string; count: number }[]) => {
      const m = new Map<string, number>();
      for (const { date, count } of series) {
        const ws = weekStartYmd(date);
        m.set(ws, (m.get(ws) || 0) + count);
      }
      return weekStarts.map((ws) => ({ date: ws, count: m.get(ws) || 0 }));
    };
    const weeklyNew = aggregateWeeklyCounts(newSeries);
    const weeklyLast = aggregateWeeklyCounts(lastSeenSeries);
    const weeklySalary = (() => {
      const m = new Map<string, number[]>();
      for (const [ymd, arr] of salaryByDate.entries()) {
        const ws = weekStartYmd(ymd);
        const list = m.get(ws) || [];
        list.push(...arr);
        m.set(ws, list);
      }
      return weekStarts.map((ws) => {
        const arr = m.get(ws) || [];
        return {
          avg: arr.length ? Math.round(mean(arr)) : 0,
          med: arr.length ? Math.round(median(arr)) : 0,
          date: ws,
        };
      });
    })();

    // --- work mode distribution
    const wm = classifyWorkMode(openings as any);
    const workModeCounts = new Map<string, number>();
    wm.forEach(group => workModeCounts.set(group.label, group.openings.length));

    // --- top cities / companies
    const cities = new Map<string, number>();
    const companies = new Map<string, number>();
    openings.forEach(o => {
      if (o.municipality_name) cities.set(o.municipality_name, (cities.get(o.municipality_name) || 0) + 1);
      if (o.company_name) companies.set(o.company_name, (companies.get(o.company_name) || 0) + 1);
    });
    const topCities = Array.from(cities.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const topCompanies = Array.from(companies.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);

    // --- age stats
    const ageStats = { avg: Math.round(mean(ages)), median: Math.round(median(ages)) };
    const bins = [ [1,3], [4,7], [8,14], [15,30], [31,60], [61,90] ] as [number,number][];
    const counts = Array(bins.length + 1).fill(0) as number[]; // last bin is 91+
    for (const a of ages) {
      let b = bins.findIndex(([lo,hi]) => a >= lo && a <= hi);
      if (b === -1) b = bins.length;
      counts[b]++;
    }
    const ageHistogram = {
      labels: [...AGE_LABELS],
      counts,
    };

    // Exact distribution 0..90 and 90+
    const ageExactLabels = [...Array(91).keys()].map((n)=>String(n)).concat("90+");
    const ageExactCounts = Array(ageExactLabels.length).fill(0) as number[];
    for (const a of agesExact) {
      const idx = a > 90 ? 91 : a; // 0..90 or 90+
      ageExactCounts[idx]++;
    }

    // --- Trending computation (last 4 weeks vs previous 4 weeks)
    const weeksForTrend = weeklyNew.map(w => w.date);
    const lastIdx = weeksForTrend.length - 1;
    const take = 4;
    const hiStart = Math.max(0, lastIdx - take + 1);
    const loEnd = hiStart - 1;
    const loStart = Math.max(0, loEnd - take + 1);
    const hiWeeks = weeksForTrend.slice(hiStart, lastIdx + 1);
    const loWeeks = weeksForTrend.slice(loStart, loEnd + 1);

    type TrendRow = { label: string; last: number; prev: number; delta: number; pct: number };

    // Build label -> openings map using computeBase once
    const base = computeBase(openings);
    const labelOpenings: Record<string, Results[]> = {};
    const pushFrom = (arr: { label: string; openings: Results[] }[] | undefined) => {
      (arr || []).forEach(c => {
        labelOpenings[c.label] = c.openings;
      });
    };
    pushFrom(base.categories.languages);
    pushFrom(base.categories.frameworks);

    // Count for a set of weeks using slug->week map
    const sumWeeks = (arr: Results[], weeks: string[]) => {
      if (!arr || !arr.length) return 0;
      const weekSet = new Set(weeks);
      let cnt = 0;
      for (const o of arr) {
        const ws = slugToWeek.get(o.slug);
        if (ws && weekSet.has(ws)) cnt++;
      }
      return cnt;
    };

    const trends: TrendRow[] = Object.entries(labelOpenings).map(([label, arr]) => {
      const last = sumWeeks(arr, hiWeeks);
      const prev = sumWeeks(arr, loWeeks);
      const delta = last - prev;
      const denom = prev === 0 ? (last > 0 ? last : 1) : prev;
      const pct = denom ? (last - prev) / denom : 0;
      return { label, last, prev, delta, pct };
    }).filter(t => t.last + t.prev >= 3);

    const topUp = trends.filter(t => t.delta > 0).sort((a,b)=> b.pct - a.pct || b.delta - a.delta).slice(0,10);
    const topDown = trends.filter(t => t.delta < 0).sort((a,b)=> a.pct - b.pct || a.delta - b.delta).slice(0,10);

    // Work mode trending
    const wmLabelOpenings: Record<string, Results[]> = {};
    wm.forEach(group => { wmLabelOpenings[group.label] = group.openings; });
    const wmTrends: TrendRow[] = Object.entries(wmLabelOpenings).map(([label, arr]) => {
      const last = sumWeeks(arr, hiWeeks);
      const prev = sumWeeks(arr, loWeeks);
      const delta = last - prev;
      const denom = prev === 0 ? (last > 0 ? last : 1) : prev;
      const pct = denom ? (last - prev) / denom : 0;
      return { label, last, prev, delta, pct };
    });

    return {
      newSeries,
      lastSeenSeries,
      workModeCounts,
      topCities,
      topCompanies,
      salaryMentioned,
      salaryMissing: openings.length - salaryMentioned,
      salaryAvgSeries,
      salaryMedSeries,
      weekdayCounts,
      ageStats,
      ageHistogram,
      weeklyNew,
      weeklyLast,
      weeklySalary,
      ageExactLabels,
      ageExactCounts,
      trendUp: topUp,
      trendDown: topDown,
      trendWeeks: { current: hiWeeks, previous: loWeeks },
      wmTrends,
    };
  }, [openings]);

  const countsSubtitle = period === "weekly" ? "Counts per week since Sep 1, 2025" : "Counts per day since Sep 1, 2025";
  const salarySubtitle = period === "weekly" ? "Weekly average and median (EUR) for postings with numeric salary" : "Daily average and median (EUR) for postings with numeric salary";

  const periodToggle = (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">Period</span>
      <div className="inline-flex items-center gap-1">
        {(["weekly","daily"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={
              "px-2 py-1 text-xs rounded-md border transition-colors " +
              (period === p
                ? "border-green-500 bg-green-500/15 text-green-300 hover:bg-green-500/25"
                : "border-gray-600 bg-transparent text-gray-200 hover:bg-gray-800/60")
            }
            aria-pressed={period === p}
          >
            {p === "weekly" ? "Weekly" : "Daily"}
          </button>
        ))}
      </div>
    </div>
  );

  const lineOptions = {
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
      },
    },
    scales: {
      x: { ticks: { color: "#a3a3a3" }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: "#a3a3a3" }, grid: { color: "#404040" } },
    },
  } as const;

  const card = (title: string, subtitle?: string, children?: React.ReactNode) => (
    <div className="w-full rounded-lg border border-gray-700 bg-zinc-900/40 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-700/70">
        <h3 className="text-base md:text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-xs md:text-sm text-gray-400">{subtitle}</p>}
      </div>
      <div className="p-2 md:p-4"><div className="h-[220px] md:h-[260px] w-full">{children}</div></div>
    </div>
  );

  return (
    <>
      <div className="flex justify-end mb-2">{periodToggle}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {card(
          "New postings",
          countsSubtitle,
          <Line
            data={{
              labels: (period === "weekly" ? weeklyNew : newSeries).map((s:any)=>s.date),
              datasets: [{
                label: "New postings",
                data: (period === "weekly" ? weeklyNew : newSeries).map((s:any)=>s.count),
                borderColor: "#60a5fa",
                backgroundColor: "rgba(96,165,250,0.2)",
                fill: true,
                tension: 0.35,
                pointRadius: 0,
              }],
            }}
            options={lineOptions}
          />
        )}
        {card(
          "Last seen",
          countsSubtitle,
          <Line
            data={{
              labels: (period === "weekly" ? weeklyLast : lastSeenSeries).map((s:any)=>s.date),
              datasets: [{
                label: "Last seen",
                data: (period === "weekly" ? weeklyLast : lastSeenSeries).map((s:any)=>s.count),
                borderColor: "#f59e0b",
                backgroundColor: "rgba(245,158,11,0.2)",
                fill: true,
                tension: 0.35,
                pointRadius: 0,
              }],
            }}
            options={lineOptions}
          />
        )}
        {card(
          "Work mode distribution",
          "Split of Remote/Hybrid/On-site",
          <Doughnut
            data={{
              labels: Array.from(workModeCounts.keys()),
              datasets: [{
                label: "Postings",
                data: Array.from(workModeCounts.values()),
                backgroundColor: ["#34d399","#fbbf24","#60a5fa"],
                borderColor: "#111827",
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: true, labels: { color: "#d4d4d4" } }, tooltip: { backgroundColor: "#111827", bodyColor: "#e7e7eb", borderColor: "#374151", borderWidth: 1 } },
            }}
          />
        )}
        {card(
          "Salary mentioned",
          "Share of postings mentioning salary",
          <Doughnut
            data={{
              labels: ["Salary mentioned","No salary"],
              datasets: [{
                label: "Postings",
                data: [salaryMentioned, salaryMissing],
                backgroundColor: ["#22c55e","#4b5563"],
                borderColor: "#111827",
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: true, labels: { color: "#d4d4d4" } }, tooltip: { backgroundColor: "#111827", bodyColor: "#e7e7eb", borderColor: "#374151", borderWidth: 1 } },
            }}
          />
        )}
        {card(
          "Average vs median salary",
          salarySubtitle,
          <Line
            data={{
              labels: (period === "weekly" ? weeklySalary : salaryAvgSeries).map((s:any)=>s.date),
              datasets: [
                {
                  label: "Avg salary (€/mo)",
                  data: (period === "weekly" ? weeklySalary.map((w:any)=>w.avg) : salaryAvgSeries.map((s:any)=>s.value)),
                  borderColor: "#22c55e",
                  backgroundColor: "rgba(34,197,94,0.2)",
                  fill: true,
                  tension: 0.35,
                  pointRadius: 0,
                },
                {
                  label: "Median salary (€/mo)",
                  data: (period === "weekly" ? weeklySalary.map((w:any)=>w.med) : salaryMedSeries.map((s:any)=>s.value)),
                  borderColor: "#a78bfa",
                  backgroundColor: "rgba(167,139,250,0.2)",
                  fill: true,
                  tension: 0.35,
                  pointRadius: 0,
                },
              ],
            }}
            options={{ ...lineOptions, scales: { ...lineOptions.scales, y: { ...lineOptions.scales.y, suggestedMin: 0 } } }}
          />
        )}
        {card(
          "New postings by weekday",
          "Count of new postings (Mon–Sun)",
          <Bar
            data={{
              labels: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
              datasets: [{
                label: "New postings",
                data: weekdayCounts,
                backgroundColor: "rgba(96,165,250,0.6)",
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { backgroundColor: "#111827", bodyColor: "#e7e7eb", borderColor: "#374151", borderWidth: 1 } },
              scales: { x: { ticks: { color: "#a3a3a3" }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: "#a3a3a3" }, grid: { color: "#404040" } } },
            }}
          />
        )}
        {card(
          `Posting age: avg ${ageStats.avg}d, median ${ageStats.median}d`,
          "Exact distribution of posting age (days 0..90+), deleted postings only",
          <Line
            data={{
              labels: ageExactLabels,
              datasets: [{
                label: "Postings",
                data: ageExactCounts,
                borderColor: "#9ca3af",
                backgroundColor: "rgba(156,163,175,0.25)",
                fill: true,
                tension: 0.25,
                pointRadius: 0,
              }]}}
            options={{
              ...lineOptions,
              scales: {
                x: { ticks: { color: "#a3a3a3", maxRotation: 0, autoSkip: true, autoSkipPadding: 8 }, grid: { display: false } },
                y: { beginAtZero: true, ticks: { color: "#a3a3a3" }, grid: { color: "#404040" } },
              },
              plugins: { ...lineOptions.plugins, legend: { display: false } },
            }}
          />
        )}
        {card(
          "Top cities",
          "Most common municipalities",
          <Bar
            data={{
              labels: topCities.map(([n])=>n),
              datasets: [{
                label: "Postings",
                data: topCities.map(([,c])=>c),
                backgroundColor: "rgba(59,130,246,0.6)",
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'y' as const,
              plugins: { legend: { display: false }, tooltip: { backgroundColor: "#111827", bodyColor: "#e7e7eb", borderColor: "#374151", borderWidth: 1 } },
              scales: { x: { ticks: { color: "#a3a3a3" }, grid: { color: "#404040" } }, y: { ticks: { color: "#d4d4d4" }, grid: { display: false } } },
            }}
          />
        )}
        {card(
          "Top companies",
          "Most frequent companies",
          <Bar
            data={{
              labels: topCompanies.map(([n])=>n),
              datasets: [{
                label: "Postings",
                data: topCompanies.map(([,c])=>c),
                backgroundColor: "rgba(16,185,129,0.6)",
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'y' as const,
              plugins: { legend: { display: false }, tooltip: { backgroundColor: "#111827", bodyColor: "#e7e7eb", borderColor: "#374151", borderWidth: 1 } },
              scales: { x: { ticks: { color: "#a3a3a3" }, grid: { color: "#404040" } }, y: { ticks: { color: "#d4d4d4" }, grid: { display: false } } },
            }}
          />
        )}
        {card(
          "Trending up (last 4w vs prev 4w)",
          "Languages & Frameworks with the strongest growth",
          <Bar
            data={{
              labels: (trendUp || []).map(t=>t.label),
              datasets: [{
                label: "% change",
                data: (trendUp || []).map(t=> Math.round(t.pct*100)),
                backgroundColor: "rgba(34,197,94,0.6)",
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'y' as const,
              plugins: { legend: { display: false }, tooltip: { backgroundColor: "#111827", bodyColor: "#e5e7eb", borderColor: "#374151", borderWidth: 1, callbacks: { label: (ctx:any) => { const t = (trendUp||[])[ctx.dataIndex]; return `${t.label}: ${Math.round(t.pct*100)}% (last ${t.last}, prev ${t.prev}, Δ ${t.delta})`; } } } },
              scales: { x: { ticks: { color: "#a3a3a3" }, grid: { color: "#404040" } }, y: { ticks: { color: "#d4d4d4" }, grid: { display: false } } },
            }}
          />
        )}
        {card(
          "Trending down (last 4w vs prev 4w)",
          "Languages & Frameworks with biggest drop",
          <Bar
            data={{
              labels: (trendDown || []).map(t=>t.label),
              datasets: [{
                label: "% change",
                data: (trendDown || []).map(t=> Math.round(t.pct*100)),
                backgroundColor: "rgba(239,68,68,0.6)",
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'y' as const,
              plugins: { legend: { display: false }, tooltip: { backgroundColor: "#111827", bodyColor: "#e5e7eb", borderColor: "#374151", borderWidth: 1, callbacks: { label: (ctx:any) => { const t = (trendDown||[])[ctx.dataIndex]; return `${t.label}: ${Math.round(t.pct*100)}% (last ${t.last}, prev ${t.prev}, Δ ${t.delta})`; } } } },
              scales: { x: { ticks: { color: "#a3a3a3" }, grid: { color: "#404040" } }, y: { ticks: { color: "#d4d4d4" }, grid: { display: false } } },
            }}
          />
        )}
        {card(
          "Work mode trend",
          "Change in Remote/Hybrid/On-site (last 4w vs prev 4w)",
          <Bar
            data={{
              labels: (wmTrends || []).map(t=>t.label),
              datasets: [{
                label: "% change",
                data: (wmTrends || []).map(t=> Math.round(t.pct*100)),
                backgroundColor: ["#34d399","#fbbf24","#60a5fa"],
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { backgroundColor: "#111827", bodyColor: "#e5e7eb", borderColor: "#374151", borderWidth: 1, callbacks: { label: (ctx:any) => { const t = (wmTrends||[])[ctx.dataIndex]; return `${t.label}: ${Math.round(t.pct*100)}% (last ${t.last}, prev ${t.prev}, Δ ${t.delta})`; } } } },
              scales: { x: { ticks: { color: "#a3a3a3" }, grid: { color: "#404040" } }, y: { ticks: { color: "#d4d4d4" }, grid: { display: false } } },
            }}
          />
        )}
      </div>
    </>
  );
}
