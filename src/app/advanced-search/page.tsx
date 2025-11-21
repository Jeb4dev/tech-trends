"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  languages,
  frameworks,
  databases,
  cloud,
  devops,
  dataScience,
  cyberSecurity,
  softSkills,
  positions,
  seniority,
  location,
} from "@/keywords";

// -- Configuration --

const WORK_MODES = ["remote", "hybrid", "onsite"];

function getLabels(list: (string | string[])[]): string[] {
  return list.map((item) => (Array.isArray(item) ? item[0] : item)).sort();
}

interface JobResult {
  id: number;
  heading: string;
  company_name: string;
  municipality_name: string;
  date_posted: string;
  work_mode: string;
  seniority: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  slug: string;
}

interface CategoryConfigItem {
  key: string;
  title: string;
  options?: string[];
  source?: (string | string[])[];
}

// Added 'companies' to the config
const CATEGORY_CONFIG: CategoryConfigItem[] = [
  { key: "workMode", title: "Work Mode", options: WORK_MODES },
  { key: "seniority", title: "Seniority", source: seniority },
  { key: "companies", title: "Companies" }, // No static source, dynamic from API
  { key: "languages", title: "Languages", source: languages },
  { key: "frameworks", title: "Frameworks", source: frameworks },
  { key: "databases", title: "Databases", source: databases },
  { key: "cloud", title: "Cloud", source: cloud },
  { key: "devops", title: "DevOps", source: devops },
  { key: "cyberSecurity", title: "Cyber Security", source: cyberSecurity },
  { key: "dataScience", title: "Data Science", source: dataScience },
  { key: "positions", title: "Role / Position", source: positions },
  { key: "softSkills", title: "Soft Skills", source: softSkills },
  { key: "locations", title: "Locations", source: location },
];

export default function AdvancedSearchPage() {
  // -- State --
  const [results, setResults] = useState<JobResult[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [facetCounts, setFacetCounts] = useState<Record<string, Record<string, number>>>({});

  // Toggles
  const [hideDeleted, setHideDeleted] = useState(true);
  const [hideOld, setHideOld] = useState(true);

  // Unified filter state
  const [filters, setFilters] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {};
    CATEGORY_CONFIG.forEach((c) => {
      initial[c.key] = new Set();
    });
    return initial;
  });

  // -- Memoized & Sorted Options --
  const optionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    CATEGORY_CONFIG.forEach((c) => {
      let rawOptions: string[] = [];

      if (c.options) {
        rawOptions = [...c.options];
      } else if (c.source) {
        rawOptions = getLabels(c.source);
      } else {
        // Dynamic categories (Companies): Use keys from facets
        const dynamicOptions = facetCounts[c.key] ? Object.keys(facetCounts[c.key]) : [];
        rawOptions = dynamicOptions;
      }

      // Sort by Count (desc), then Alphabetical
      const categoryFacets = facetCounts[c.key] || {};

      // Always sort, putting selected items at top is handled by UI state usually,
      // but here we just sort the list.
      map[c.key] = rawOptions.sort((a, b) => {
        const countA = categoryFacets[a] || 0;
        const countB = categoryFacets[b] || 0;
        if (countB !== countA) return countB - countA;
        return a.localeCompare(b);
      });
    });
    return map;
  }, [facetCounts]);

  // -- Fetch Logic --
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, set]) => {
          if (set.size > 0) {
            params.set(key, Array.from(set).join(","));
          }
        });

        params.set("hideDeleted", hideDeleted.toString());
        params.set("hideOld", hideOld.toString());
        params.set("page", "1");

        const res = await fetch(`/api/v2/jobs?${params.toString()}`);
        if (!res.ok) throw new Error("Search failed");

        const data = await res.json();
        setResults(data.results || []);
        setCount(data.count || 0);
        setFacetCounts(data.facets || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchJobs, 400);
    return () => clearTimeout(timeout);
  }, [filters, hideDeleted, hideOld]);

  // -- Handlers --
  const toggleFilter = (categoryKey: string, value: string) => {
    setFilters((prev) => {
      const nextSet = new Set(prev[categoryKey]);
      if (nextSet.has(value)) nextSet.delete(value);
      else nextSet.add(value);
      return { ...prev, [categoryKey]: nextSet };
    });
  };

  const clearAll = () => {
    setFilters((prev) => {
      const next: Record<string, Set<string>> = {};
      Object.keys(prev).forEach((k) => (next[k] = new Set()));
      return next;
    });
  };

  const activeFilterCount = Object.values(filters).reduce((acc, s) => acc + s.size, 0);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <header className="mb-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Advanced Job Search</h1>
            <p className="text-gray-400 text-sm">Live SQL query against structured tags.</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <Toggle label="Hide Deleted" checked={hideDeleted} onChange={setHideDeleted} />
            <Toggle label="Hide 90+ Days Old" checked={hideOld} onChange={setHideOld} />
            {activeFilterCount > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 bg-red-900/10 px-3 py-1.5 rounded transition-colors"
              >
                Clear filters ({activeFilterCount})
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* --- Sidebar Filters --- */}
        <aside className="xl:col-span-1 space-y-8 pr-2 h-fit sticky top-4">
          {CATEGORY_CONFIG.map((cat) => (
            <FilterSection
              key={cat.key}
              title={cat.title}
              options={optionsMap[cat.key]}
              counts={facetCounts[cat.key] || {}}
              selected={filters[cat.key]}
              onToggle={(val) => toggleFilter(cat.key, val)}
              limit={cat.key === "workMode" || cat.key === "seniority" ? undefined : 8}
            />
          ))}
        </aside>

        {/* --- Results Area --- */}
        <main className="xl:col-span-3">
          <div className="flex items-center justify-between mb-4 bg-slate-900/50 p-3 rounded border border-slate-800 sticky top-4 z-10 backdrop-blur-md">
            <h2 className="text-lg font-medium text-gray-200">
              Found <span className="text-green-400 font-bold">{count}</span> jobs
            </h2>
            {loading && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                <span className="text-sm text-blue-400">Updating...</span>
              </div>
            )}
          </div>

          <div className="grid gap-3">
            {results.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}

            {!loading && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-800 rounded-lg text-gray-500">
                <p>No jobs found matching your criteria.</p>
                <button onClick={clearAll} className="mt-4 text-blue-400 hover:underline text-sm">
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// --- Subcomponents ---

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-full hover:border-slate-600 transition-colors">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
      </div>
      <span className="text-xs font-medium text-gray-300">{label}</span>
    </label>
  );
}

function JobCard({ job }: { job: JobResult }) {
  return (
    <div className="group relative p-4 sm:p-5 border border-gray-800 bg-slate-900/40 rounded-lg hover:border-green-500/30 hover:bg-slate-800/50 transition-all">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-blue-300 group-hover:text-blue-200 truncate">
            <a
              href={`https://duunitori.fi/tyopaikat/tyo/${job.slug}`}
              target="_blank"
              rel="noreferrer"
              className="focus:outline-none"
            >
              <span className="absolute inset-0" aria-hidden="true" />
              {job.heading}
            </a>
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            <span className="text-gray-300 font-medium">{job.company_name}</span>
            {job.municipality_name && (
              <>
                <span className="mx-2 text-gray-600">•</span>
                <span>{job.municipality_name}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1 text-xs text-gray-500 shrink-0">
          <time dateTime={job.date_posted}>{new Date(job.date_posted).toLocaleDateString("fi-FI")}</time>
          {job.salary_min && (
            <span className="text-emerald-400 font-mono bg-emerald-900/20 px-1.5 py-0.5 rounded">
              {job.salary_min} {job.salary_max && job.salary_max !== job.salary_min ? `- ${job.salary_max}` : "+"} €
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 relative z-10 pointer-events-none">
        {job.work_mode && job.work_mode !== "unknown" && (
          <Badge color={job.work_mode === "remote" ? "green" : job.work_mode === "hybrid" ? "amber" : "blue"}>
            {job.work_mode}
          </Badge>
        )}
        {job.seniority && <Badge color="purple">{job.seniority}</Badge>}
      </div>
    </div>
  );
}

interface FilterSectionProps {
  title: string;
  options: string[];
  counts: Record<string, number>;
  selected: Set<string>;
  onToggle: (value: string) => void;
  limit?: number;
}

function FilterSection({ title, options, counts, selected, onToggle, limit }: FilterSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const hasSelection = selected.size > 0;

  const visibleOptions = expanded || !limit ? options : options.slice(0, limit);

  return (
    <div className="border-b border-gray-800 last:border-0 pb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-200 text-sm uppercase tracking-wider">{title}</h3>
        {hasSelection && (
          <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 rounded-full min-w-[1.25rem] text-center">
            {selected.size}
          </span>
        )}
      </div>

      <div className="space-y-2 pl-1">
        {visibleOptions.map((opt) => {
          const isActive = selected.has(opt);
          const count = counts[opt] || 0;
          return (
            <label key={opt} className="flex items-start gap-3 cursor-pointer group select-none w-full">
              <div
                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                  isActive ? "bg-green-600 border-green-600" : "border-gray-600 bg-gray-900 group-hover:border-gray-500"
                }`}
              >
                {isActive && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <input type="checkbox" className="hidden" checked={isActive} onChange={() => onToggle(opt)} />
              <div className="flex justify-between w-full text-sm leading-tight">
                <span
                  className={`transition-colors ${
                    isActive ? "text-white font-medium" : "text-gray-400 group-hover:text-gray-300"
                  }`}
                >
                  {opt}
                </span>
                <span className="text-gray-600 text-xs">{count}</span>
              </div>
            </label>
          );
        })}
      </div>

      {limit && options.length > limit && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-400 hover:text-blue-300 mt-3 ml-1 font-medium flex items-center gap-1 focus:outline-none"
        >
          {expanded ? (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Show Less
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Show All ({options.length})
            </>
          )}
        </button>
      )}
    </div>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  color: "purple" | "amber" | "blue" | "green";
}

function Badge({ children, color }: BadgeProps) {
  const colors = {
    purple: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    blue: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border uppercase tracking-wide ${colors[color]}`}
    >
      {children}
    </span>
  );
}
