"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import PopularityChart from "@/components/charts/PopularityChart";
import StackedShareChart from "@/components/charts/StackedShareChart";
import ToplineBars from "@/components/charts/ToplineBars";
import SalaryBars from "@/components/charts/SalaryBars";
import TrendingBars from "@/components/charts/TrendingBars";
import { getAllCategories, getCategoryBySlug } from "@/lib/categories";
import type { Category, ResponseData, Results } from "@/types";
import { computeBase } from "@/compute";
import type { SlimBase } from "@/compute";

export default function CategoryPage() {
  const params = useParams<{ category: string }>();
  const categoryInfo = getCategoryBySlug(params.category);

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
    return () => {
      cancelled = true;
    };
  }, []);

  const baseCategories = useMemo(() => {
    if (!categoryInfo) return [];

    if (precomputedSlim) {
      const byId = new Map<number, Results>();
      if (data.results.length) {
        data.results.forEach((o) => byId.set(o.id, o));
      }
      const slimCats = (precomputedSlim.categories as Record<string, { label: string; ids: number[] }[] | undefined>)[categoryInfo.key];
      if (!slimCats) return [];
      return slimCats.map((c) => ({
        label: c.label,
        active: false,
        openings: data.results.length ? c.ids.map((id) => byId.get(id)!).filter(Boolean) : [],
        filteredOpenings: [],
        _baseCount: c.ids.length,
      })) as Category[];
    }

    if (!data.results.length) return [] as Category[];
    const computed = computeBase(data.results);
    const cats = (computed.categories as Record<string, Category[] | undefined>)[categoryInfo.key];
    return cats || [];
  }, [precomputedSlim, data.results, categoryInfo]);

  // Default top 10 selection
  const defaultSelection = useMemo(() => {
    const sorted = [...baseCategories].sort((a, b) => {
      const ca = a.openings?.length || (a as any)._baseCount || 0;
      const cb = b.openings?.length || (b as any)._baseCount || 0;
      return cb - ca;
    });
    return sorted.slice(0, 10).map((c) => c.label);
  }, [baseCategories]);

  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    if (selected.length === 0 && defaultSelection.length) setSelected(defaultSelection);
  }, [defaultSelection, selected.length]);

  if (!categoryInfo) {
    notFound();
  }

  const allCategories = getAllCategories();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 md:px-6 lg:px-8 py-4">
        <Breadcrumbs
          items={[
            { label: "Etusivu", href: "/" },
            { label: "Trendit", href: "/trends" },
            { label: categoryInfo.nameFi },
          ]}
        />
        <h1 className="text-2xl md:text-3xl font-semibold">{categoryInfo.nameFi}</h1>
        <p className="text-sm text-gray-400 mt-2">Ladataan…</p>
      </div>
    );
  }

  const toggle = (label: string) => {
    setSelected((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]));
  };

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-6 lg:px-8 py-4">
      <Breadcrumbs
        items={[
          { label: "Etusivu", href: "/" },
          { label: "Trendit", href: "/trends" },
          { label: categoryInfo.nameFi },
        ]}
      />

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">{categoryInfo.nameFi}</h1>
          <p className="text-sm text-gray-400 mt-1">{categoryInfo.descriptionFi}</p>
        </div>
        <Link href="/trends" className="text-sm text-green-400 hover:underline">
          Takaisin trendeihin
        </Link>
      </div>

      <div className="mt-4">
        <PopularityChart items={baseCategories} selected={selected} categoryLabel={categoryInfo.nameEn} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4">
        <StackedShareChart items={baseCategories} selected={selected} categoryLabel={categoryInfo.nameEn} />
        <ToplineBars items={baseCategories} selected={selected} categoryLabel={categoryInfo.nameEn} />
        <SalaryBars items={baseCategories} selected={selected} categoryLabel={categoryInfo.nameEn} />
        <TrendingBars items={baseCategories} selected={selected} categoryLabel={categoryInfo.nameEn} />
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold mb-2">Valitse seurattavat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {baseCategories.map((item) => {
            const active = selected.includes(item.label);
            return (
              <button
                key={item.label}
                type="button"
                className={
                  "px-2.5 py-1 text-xs sm:text-sm rounded-md border transition-colors text-left truncate " +
                  (active
                    ? "border-green-500 bg-green-500/15 text-green-300 hover:bg-green-500/25"
                    : "border-gray-600 bg-transparent text-gray-200 hover:bg-gray-800/60")
                }
                onClick={() => toggle(item.label)}
                aria-pressed={active}
                title={item.label}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">Valittu: {selected.length}</p>
      </div>

      {/* Sibling categories */}
      <div className="mt-10 border-t border-gray-700/50 pt-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Muut kategoriat</h2>
        <div className="flex flex-wrap gap-2">
          {allCategories
            .filter((c) => c.slug !== params.category)
            .map((c) => (
              <Link
                key={c.slug}
                href={`/trends/${c.slug}`}
                className="px-3 py-1.5 text-xs rounded-md border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
              >
                {c.nameFi}
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
