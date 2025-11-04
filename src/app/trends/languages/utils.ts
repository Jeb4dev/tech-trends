import { Results } from "@/types";

export function toDateOnly(str: string | undefined | null): string | null {
  if (!str) return null;
  const m = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map((v) => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

// Build a daily active-count series for a set of openings
export function buildSeries(openings: Results[]): { date: string; count: number }[] {
  if (!openings || openings.length === 0) return [];

  let minYmd: string | null = null;
  let maxYmd: string | null = null;

  for (const o of openings) {
    const start = toDateOnly(o.date_posted);
    const end = toDateOnly(o.last_seen_at || o.date_posted);
    if (start) {
      if (!minYmd || start < minYmd) minYmd = start;
      if (!maxYmd || start > maxYmd) maxYmd = start;
    }
    if (end) {
      if (!maxYmd || end > maxYmd) maxYmd = end;
    }
  }
  if (!minYmd) return [];
  if (!maxYmd) maxYmd = formatYmd(new Date());

  const startDate = parseYmd(minYmd);
  const endDate = parseYmd(maxYmd);

  const diff = new Map<string, number>();
  const inc = (ymd: string, delta: number) => diff.set(ymd, (diff.get(ymd) || 0) + delta);

  for (const o of openings) {
    const s = toDateOnly(o.date_posted);
    const e0 = toDateOnly(o.last_seen_at || o.date_posted);
    if (!s) continue;
    const e = e0 && e0 >= s ? e0 : s; // ensure e >= s
    inc(s, +1);
    const ePlus = formatYmd(addDays(parseYmd(e), 1));
    inc(ePlus, -1);
  }

  // Initial running count at start
  let running = 0;
  for (const o of openings) {
    const s = toDateOnly(o.date_posted);
    const e0 = toDateOnly(o.last_seen_at || o.date_posted);
    if (!s) continue;
    const e = e0 && e0 >= s ? e0 : s;
    if (s <= minYmd! && e >= minYmd!) running++;
  }

  const series: { date: string; count: number }[] = [];
  let first = true;
  for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
    const ymd = formatYmd(d);
    if (!first) running += diff.get(ymd) || 0;
    series.push({ date: ymd, count: running });
    first = false;
  }
  return series;
}

export function buildUnionLabels(seriesByLang: Map<string, { date: string; count: number }[]>): string[] {
  let min: string | null = null;
  let max: string | null = null;
  for (const s of seriesByLang.values()) {
    if (!s.length) continue;
    const smin = s[0].date;
    const smax = s[s.length - 1].date;
    if (!min || smin < min) min = smin;
    if (!max || smax > max) max = smax;
  }
  if (!min || !max) return [] as string[];
  const start = parseYmd(min);
  const end = parseYmd(max);
  const labels: string[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) labels.push(formatYmd(d));
  return labels;
}

export function colorForIndex(i: number): string {
  const hue = (i * 37) % 360; // pseudo-random spread
  return `hsl(${hue} 70% 55%)`;
}

