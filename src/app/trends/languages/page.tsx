"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import LanguagesPopularityChart from "./languages-popularity-chart";
import LanguagesStackedShareChart from "./languages-stacked-share-chart";
import LanguagesToplineBars from "./languages-topline-bars";
import LanguagesSalaryBars from "./languages-salary-bars";
import LanguagesTrendingBars from "./languages-trending-bars";
import type { Category, ResponseData, Results } from "@/types";
import { computeBase } from "@/compute";
import type { SlimBase } from "@/compute";

export default function LanguagesPopularityPage() {
  const [data, setData] = useState<ResponseData>({ count: 0, next: null, previous: null, results: [] });
  const [precomputedSlim, setPrecomputedSlim] = useState<SlimBase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const baseRes = await fetch("/api/v1/base");
        const base = (await baseRes.json()) as SlimBase;
        if (!cancelled) setPrecomputedSlim(base);
        const jobsRes = await fetch("/api/v1/jobs");
        const jobs = (await jobsRes.json()) as ResponseData;
        if (!cancelled) {
          jobs.results.forEach((r) => {
            if (!r._headingLower) r._headingLower = r.heading.toLowerCase();
            if (!r._descrLower) r._descrLower = r.descr.toLowerCase();
          });
          setData(jobs);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const baseCategories = useMemo(() => {
    if (precomputedSlim) {
      const byId = new Map<number, Results>();
      if (data.results.length) {
        data.results.forEach((o) => byId.set(o.id, o));
      }
      const makeCats = (arr: { label: string; ids: number[] }[] | undefined) =>
        (arr || []).map((c) => ({
          label: c.label,
          active: false,
          openings: data.results.length ? c.ids.map((id) => byId.get(id)!).filter(Boolean) : [],
          filteredOpenings: [],
          _baseCount: c.ids.length,
        }));
      return {
        languages: makeCats(precomputedSlim.categories.languages || []),
      };
    }
    if (!data.results.length) return { languages: [] as Category[] };
    const computed = computeBase(data.results);
    return { languages: computed.categories.languages } as { languages: Category[] };
  }, [precomputedSlim, data.results]);

  // pick default top 10 by base count (or current openings length if available)
  const defaultSelection = useMemo(() => {
    const sorted = [...baseCategories.languages].sort((a, b) => {
      const ca = a.openings?.length || a._baseCount || 0;
      const cb = b.openings?.length || b._baseCount || 0;
      return cb - ca;
    });
    return sorted.slice(0, 10).map((c) => c.label);
  }, [baseCategories.languages]);

  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    // initialize once baseCategories are ready
    if (selected.length === 0 && defaultSelection.length) setSelected(defaultSelection);
  }, [defaultSelection, selected.length]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 md:px-6 lg:px-8 py-4">
        <h1 className="text-2xl md:text-3xl font-semibold">Languages popularity</h1>
        <p className="text-sm text-gray-400 mt-2">Loading…</p>
      </div>
    );
  }

  const toggle = (label: string) => {
    setSelected((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]));
  };

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-6 lg:px-8 py-4">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <h1 className="text-2xl md:text-3xl font-semibold">Programming languages popularity</h1>
        <Link href="/trends" className="text-sm text-green-400 hover:underline">Back to trends</Link>
      </div>

      <div className="mt-4">
        <LanguagesPopularityChart languages={baseCategories.languages} selected={selected} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4">
        <LanguagesStackedShareChart languages={baseCategories.languages} selected={selected} />
        <LanguagesToplineBars languages={baseCategories.languages} selected={selected} />
        <LanguagesSalaryBars languages={baseCategories.languages} selected={selected} />
        <LanguagesTrendingBars languages={baseCategories.languages} selected={selected} />
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold mb-2">Select languages</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {baseCategories.languages.map((lang) => {
            const active = selected.includes(lang.label);
            return (
              <button
                key={lang.label}
                type="button"
                className={
                  "px-2.5 py-1 text-xs sm:text-sm rounded-md border transition-colors text-left truncate " +
                  (active
                    ? "border-green-500 bg-green-500/15 text-green-300 hover:bg-green-500/25"
                    : "border-gray-600 bg-transparent text-gray-200 hover:bg-gray-800/60")
                }
                onClick={() => toggle(lang.label)}
                aria-pressed={active}
                title={lang.label}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">Currently selected: {selected.length}</p>
      </div>
    </div>
  );
}
