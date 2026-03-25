"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { SubscribeModal } from "@/components/SubscribeModal";
import {
  languages,
  frameworks,
  databases,
  cloud,
  devops,
  dataScience,
  cyberSecurity,
  softSkills,
  roles,
  seniority,
  location,
} from "@/keywords";

// -- Configuration --

const WORK_MODES = ["remote", "hybrid", "onsite"];

const SORT_OPTIONS = [
  { label: "Newest First", value: "date_desc" },
  { label: "Oldest First", value: "date_asc" },
  { label: "Salary: High to Low", value: "salary_desc" },
  { label: "Salary: Low to High", value: "salary_asc" },
  { label: "Company: A-Z", value: "company_asc" },
];

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
  salary_label?: string | null;
  slug: string;
  locations?: string[];
  ai_classified_at?: string | null;
}

interface AiTag {
  category: string;
  keyword: string;
  origin?: string;
}

interface ComparisonData {
  jobId: number;
  heading: string;
  company_name: string;
  ai_classified_at: string | null;
  manual: {
    tags: { category: string; keyword: string }[];
    seniority: string | null;
    workMode: string | null;
  };
  ai: {
    tags: AiTag[];
  };
}

interface CategoryConfigItem {
  key: string;
  title: string;
  type: "tag" | "column";
  options?: string[];
  source?: (string | string[])[];
  dbCategory?: string; // Override database category name (e.g., "roles" -> "positions")
}

const CATEGORY_CONFIG: CategoryConfigItem[] = [
  { key: "workMode", title: "Work Mode", type: "column", options: WORK_MODES },
  { key: "seniority", title: "Seniority", type: "column", source: seniority },
  { key: "companies", title: "Companies", type: "column" },
  { key: "languages", title: "Languages", type: "tag", source: languages },
  { key: "frameworks", title: "Frameworks", type: "tag", source: frameworks },
  { key: "databases", title: "Databases", type: "tag", source: databases },
  { key: "cloud", title: "Cloud", type: "tag", source: cloud },
  { key: "devops", title: "DevOps", type: "tag", source: devops },
  { key: "cyberSecurity", title: "Cyber Security", type: "tag", source: cyberSecurity },
  { key: "dataScience", title: "Data Science", type: "tag", source: dataScience },
  { key: "roles", title: "Role / Position", type: "tag", source: roles, dbCategory: "positions" },
  { key: "softSkills", title: "Soft Skills", type: "tag", source: softSkills },
  { key: "locations", title: "Locations", type: "tag", source: location },
];

// -- Icons --
const Icons = {
  Filter: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  ),
  X: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  XLarge: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Check: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  MapPin: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Sort: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Ban: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    </svg>
  ),
  Code: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  ),
  Sparkle: () => (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  ),
};

// Complex Filter State
type CategoryState = {
  operator: "AND" | "OR";
  include: Set<string>;
  exclude: Set<string>;
};

type FilterState = Record<string, CategoryState>;

const INITIAL_FILTER_STATE = (): FilterState => {
  const initial: FilterState = {};
  CATEGORY_CONFIG.forEach((c) => {
    initial[c.key] = { operator: "OR", include: new Set(), exclude: new Set() };
  });
  return initial;
};

// -- Query String Generation & Parsing --

function generateQueryString(filters: FilterState): string {
  const parts: string[] = [];

  CATEGORY_CONFIG.forEach((cat) => {
    const state = filters[cat.key];
    if (state.include.size === 0 && state.exclude.size === 0) return;

    const categoryParts: string[] = [];

    if (state.include.size > 0) {
      const includeItems = Array.from(state.include).map((item) => `${cat.key}:"${item}"`);
      if (includeItems.length === 1) {
        categoryParts.push(includeItems[0]);
      } else {
        const joined = includeItems.join(` ${state.operator} `);
        categoryParts.push(`(${joined})`);
      }
    }

    if (state.exclude.size > 0) {
      const excludeItems = Array.from(state.exclude).map((item) => `NOT ${cat.key}:"${item}"`);
      categoryParts.push(...excludeItems);
    }

    if (categoryParts.length > 0) {
      parts.push(categoryParts.join(" AND "));
    }
  });

  return parts.join("\nAND ");
}

function parseQueryToFilters(query: string): FilterState | null {
  try {
    const newFilters = INITIAL_FILTER_STATE();
    const normalized = query.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    if (!normalized) return newFilters;

    const tokenRegex = /(NOT\s+)?(\w+):"([^"]+)"/g;
    let match;
    while ((match = tokenRegex.exec(normalized)) !== null) {
      const isNot = !!match[1];
      const categoryKey = match[2];
      const value = match[3];

      const catConfig = CATEGORY_CONFIG.find((c) => c.key === categoryKey);
      if (!catConfig) continue;

      if (isNot) {
        newFilters[categoryKey].exclude.add(value);
      } else {
        newFilters[categoryKey].include.add(value);
      }
    }

    return newFilters;
  } catch (e) {
    console.error("Failed to parse query:", e);
    return null;
  }
}

function validateQuerySyntax(query: string): { valid: boolean; error?: string } {
  const normalized = query.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return { valid: true };

  let parenCount = 0;
  for (const char of normalized) {
    if (char === "(") parenCount++;
    if (char === ")") parenCount--;
    if (parenCount < 0) return { valid: false, error: "Unbalanced parentheses" };
  }
  if (parenCount !== 0) return { valid: false, error: "Unbalanced parentheses" };

  const quoteCount = (normalized.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) return { valid: false, error: "Unbalanced quotes" };

  const tokenRegex = /(NOT\s+)?(\w+):"([^"]+)"/g;
  let match;
  let hasValidToken = false;

  while ((match = tokenRegex.exec(normalized)) !== null) {
    const categoryKey = match[2];
    const catConfig = CATEGORY_CONFIG.find((c) => c.key === categoryKey);
    if (!catConfig) return { valid: false, error: `Unknown category: ${categoryKey}` };
    hasValidToken = true;
  }

  if (normalized && !hasValidToken) {
    const cleanedForCheck = normalized
      .replace(/\b(AND|OR|NOT)\b/g, "")
      .replace(/[()]/g, "")
      .trim();
    if (cleanedForCheck) return { valid: false, error: "Invalid syntax" };
  }

  return { valid: true };
}

function queryToApiParams(query: string): URLSearchParams {
  const params = new URLSearchParams();
  const normalized = query.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

  if (!normalized) return params;

  const tokenRegex = /(NOT\s+)?(\w+):"([^"]+)"/g;
  const categoryIncludes: Record<string, string[]> = {};
  const categoryExcludes: Record<string, string[]> = {};

  let match;
  while ((match = tokenRegex.exec(normalized)) !== null) {
    const isNot = !!match[1];
    const categoryKey = match[2];
    const value = match[3];

    if (isNot) {
      if (!categoryExcludes[categoryKey]) categoryExcludes[categoryKey] = [];
      categoryExcludes[categoryKey].push(value);
    } else {
      if (!categoryIncludes[categoryKey]) categoryIncludes[categoryKey] = [];
      categoryIncludes[categoryKey].push(value);
    }
  }

  Object.entries(categoryIncludes).forEach(([key, values]) => {
    params.set(`${key}_in`, values.join(","));
  });

  Object.entries(categoryExcludes).forEach(([key, values]) => {
    params.set(`${key}_ex`, values.join(","));
  });

  params.set("rawQuery", normalized);

  return params;
}

function updateQueryWithToggle(
  currentQuery: string,
  categoryKey: string,
  value: string,
  nowIncluded: boolean,
  nowExcluded: boolean,
): string {
  const normalized = currentQuery.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  let updated = normalized
    .replace(new RegExp(`\\s*AND\\s+NOT\\s+${categoryKey}:"${escapedValue}"`, "g"), "")
    .replace(new RegExp(`\\s*OR\\s+NOT\\s+${categoryKey}:"${escapedValue}"`, "g"), "")
    .replace(new RegExp(`NOT\\s+${categoryKey}:"${escapedValue}"\\s*AND\\s*`, "g"), "")
    .replace(new RegExp(`NOT\\s+${categoryKey}:"${escapedValue}"\\s*OR\\s*`, "g"), "")
    .replace(new RegExp(`NOT\\s+${categoryKey}:"${escapedValue}"`, "g"), "")
    .replace(new RegExp(`\\s*AND\\s+${categoryKey}:"${escapedValue}"`, "g"), "")
    .replace(new RegExp(`\\s*OR\\s+${categoryKey}:"${escapedValue}"`, "g"), "")
    .replace(new RegExp(`${categoryKey}:"${escapedValue}"\\s*AND\\s*`, "g"), "")
    .replace(new RegExp(`${categoryKey}:"${escapedValue}"\\s*OR\\s*`, "g"), "")
    .replace(new RegExp(`${categoryKey}:"${escapedValue}"`, "g"), "");

  updated = updated
    .replace(/\(\s*\)/g, "")
    .replace(/^\s*AND\s+/i, "")
    .replace(/^\s*OR\s+/i, "")
    .replace(/\s+AND\s*$/i, "")
    .replace(/\s+OR\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (nowIncluded) {
    const token = `${categoryKey}:"${value}"`;
    updated = updated ? `${updated} AND ${token}` : token;
  } else if (nowExcluded) {
    const token = `NOT ${categoryKey}:"${value}"`;
    updated = updated ? `${updated} AND ${token}` : token;
  }

  return updated;
}

export default function AdvancedSearchPage() {
  const [results, setResults] = useState<JobResult[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [facetCounts, setFacetCounts] = useState<Record<string, Record<string, number>>>({});

  const searchParams = useSearchParams();
  const urlParamsInitialized = useRef(false);

  const [queryText, setQueryText] = useState("");
  const [queryError, setQueryError] = useState<string | null>(null);

  // Initialize filters from URL search params on first mount
  useEffect(() => {
    if (urlParamsInitialized.current || !searchParams.size) return;
    urlParamsInitialized.current = true;

    // Build a reverse map: DB category name → advanced-search key (e.g. "positions" → "roles")
    const dbCatToKey: Record<string, string> = {};
    CATEGORY_CONFIG.forEach((cfg) => {
      dbCatToKey[cfg.dbCategory ?? cfg.key] = cfg.key;
    });

    const tokens: string[] = [];
    searchParams.forEach((value, paramKey) => {
      if (paramKey.endsWith("_in")) {
        const rawKey = paramKey.slice(0, -3);
        const searchKey = dbCatToKey[rawKey] ?? rawKey;
        value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
          .forEach((v) => tokens.push(`${searchKey}:"${v}"`));
      }
    });

    if (tokens.length > 0) setQueryText(tokens.join(" AND "));
  }, [searchParams]);

  const [hideDeleted, setHideDeleted] = useState(true);
  const [hideOld, setHideOld] = useState(true);
  const [sort, setSort] = useState("date_desc");
  const [page, setPage] = useState(1);
  const [sortOpen, setSortOpen] = useState(false);

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  // AI classification state
  const [aiClassifying, setAiClassifying] = useState<number | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  const triggerAiClassify = async (jobId: number) => {
    setAiClassifying(jobId);
    try {
      const res = await fetch("/api/admin/ai-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          // Already classified, just open comparison
          await openComparison(jobId);
          return;
        }
        throw new Error(data.error || "AI classification failed");
      }
      // Update the job in results to reflect it's been classified
      setResults((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, ai_classified_at: new Date().toISOString() } : j)),
      );
      // Open comparison view
      await openComparison(jobId);
    } catch (e: any) {
      console.error("AI classify error:", e);
      alert(e.message || "AI classification failed");
    } finally {
      setAiClassifying(null);
    }
  };

  const openComparison = async (jobId: number) => {
    setComparisonLoading(true);
    setComparisonData(null);
    try {
      const res = await fetch(`/api/v2/jobs/${jobId}/ai-tags`);
      if (!res.ok) throw new Error("Failed to fetch comparison data");
      const data = await res.json();
      setComparisonData(data);
    } catch (e) {
      console.error(e);
      alert("Failed to load comparison data");
    } finally {
      setComparisonLoading(false);
    }
  };

  const filters = useMemo(() => parseQueryToFilters(queryText) || INITIAL_FILTER_STATE(), [queryText]);

  const subscribeCriteria = useMemo(() => {
    const toArray = (s: Set<string>) => (s.size > 0 ? Array.from(s) : undefined);
    return {
      languages_in: toArray(filters["languages"]?.include),
      frameworks_in: toArray(filters["frameworks"]?.include),
      databases_in: toArray(filters["databases"]?.include),
      cloud_in: toArray(filters["cloud"]?.include),
      devops_in: toArray(filters["devops"]?.include),
      dataScience_in: toArray(filters["dataScience"]?.include),
      cyberSecurity_in: toArray(filters["cyberSecurity"]?.include),
      softSkills_in: toArray(filters["softSkills"]?.include),
      positions_in: toArray(filters["roles"]?.include), // "roles" in UI maps to "positions_in" for database
      locations_in: toArray(filters["locations"]?.include),
      workMode_in: toArray(filters["workMode"]?.include),
      seniority_in: toArray(filters["seniority"]?.include),
    };
  }, [filters]);

  useEffect(() => {
    const validation = validateQuerySyntax(queryText);
    setQueryError(validation.valid ? null : validation.error || "Invalid syntax");
  }, [queryText]);

  const handleQueryChange = (value: string) => {
    setQueryText(value);
    setPage(1);
  };

  const toggleItem = (categoryKey: string, value: string) => {
    const currentFilters = parseQueryToFilters(queryText) || INITIAL_FILTER_STATE();
    const cat = currentFilters[categoryKey];

    if (cat.include.has(value)) {
      cat.include.delete(value);
      cat.exclude.add(value);
    } else if (cat.exclude.has(value)) {
      cat.exclude.delete(value);
    } else {
      cat.include.add(value);
    }

    const newQuery = generateQueryString(currentFilters);
    setQueryText(newQuery);
    setPage(1);
  };

  const clearAll = () => {
    setQueryText("");
    setPage(1);
    setQueryError(null);
  };

  const optionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    CATEGORY_CONFIG.forEach((c) => {
      let rawOptions: string[] = [];
      if (c.options) rawOptions = [...c.options];
      else if (c.source) rawOptions = getLabels(c.source);
      else rawOptions = facetCounts[c.key] ? Object.keys(facetCounts[c.key]) : [];

      const categoryFacets = facetCounts[c.key] || {};
      map[c.key] = rawOptions.sort((a, b) => {
        const countA = categoryFacets[a] || 0;
        const countB = categoryFacets[b] || 0;
        if (countB !== countA) return countB - countA;
        return a.localeCompare(b);
      });
    });
    return map;
  }, [facetCounts]);

  useEffect(() => {
    const fetchJobs = async () => {
      if (queryError) return;

      setLoading(true);
      try {
        const params = queryToApiParams(queryText);
        params.set("hideDeleted", hideDeleted.toString());
        params.set("hideOld", hideOld.toString());
        params.set("sort", sort);
        params.set("page", page.toString());

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
  }, [queryText, queryError, hideDeleted, hideOld, sort, page]);

  const toggleOperator = (categoryKey: string) => {
    const currentFilters = parseQueryToFilters(queryText) || INITIAL_FILTER_STATE();
    const cat = currentFilters[categoryKey];

    cat.operator = cat.operator === "AND" ? "OR" : "AND";

    const newQuery = generateQueryString({ ...currentFilters, [categoryKey]: cat });
    setQueryText(newQuery);
  };

  const activeFilterCount = Object.values(filters).reduce((acc, c) => acc + c.include.size + c.exclude.size, 0);

  // Lock body scroll when mobile filters are open
  useEffect(() => {
    if (showMobileFilters) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showMobileFilters]);

  return (
    <div className="min-h-screen">
      {/* Header - full width, fixed */}
      <header className="fixed top-14 left-0 right-0 z-40 border-b border-white/5 bg-[#0d1117]/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
          <h1 className="!text-base !py-0 font-bold text-white tracking-tight">Advanced Search</h1>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <Toggle label="Hide Deleted" checked={hideDeleted} onChange={(v) => { setHideDeleted(v); setPage(1); }} />
              <Toggle label="Hide Old Jobs" checked={hideOld} onChange={(v) => { setHideOld(v); setPage(1); }} />
            </div>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden relative p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Icons.Filter />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-14" />

      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Sidebar - mobile: slide-over from left, desktop: sticky */}
        <aside
          className={`
          fixed top-14 left-0 bottom-0 z-50 w-[min(320px,85vw)] bg-[#0d1117] border-r border-white/5 overflow-y-auto transition-transform duration-300 ease-in-out
          xl:translate-x-0 xl:static xl:z-0 xl:w-auto xl:bg-transparent xl:border-r-0 xl:col-span-3 xl:block xl:h-[calc(100vh-7rem)] xl:overflow-y-auto xl:sticky xl:top-[7rem]
          scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10
          ${showMobileFilters ? "translate-x-0" : "-translate-x-full"}
        `}
        >
          {/* Mobile filter header */}
          <div className="sticky top-0 z-10 bg-[#0d1117] border-b border-white/5 px-4 py-3 flex items-center justify-between xl:hidden">
            <span className="text-sm font-semibold text-white">Filters</span>
            <button
              onClick={() => setShowMobileFilters(false)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Icons.XLarge />
            </button>
          </div>

          <div className="p-4 xl:p-0 xl:pt-2">
            {/* Mobile toggles */}
            <div className="xl:hidden mb-4 flex flex-col gap-2">
              <Toggle label="Hide Deleted" checked={hideDeleted} onChange={(v) => { setHideDeleted(v); setPage(1); }} />
              <Toggle label="Hide Old Jobs" checked={hideOld} onChange={(v) => { setHideOld(v); setPage(1); }} />
            </div>

            <div className="space-y-0.5">
              {CATEGORY_CONFIG.map((cat) => (
                <FilterSection
                  key={cat.key}
                  title={cat.title}
                  type={cat.type}
                  options={optionsMap[cat.key]}
                  counts={facetCounts[cat.key] || {}}
                  state={filters[cat.key]}
                  onToggleItem={(val: string) => toggleItem(cat.key, val)}
                  onToggleOperator={() => toggleOperator(cat.key)}
                  limit={cat.key === "companies" ? 5 : 8}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* Backdrop overlay for mobile sidebar */}
        {showMobileFilters && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 xl:hidden"
            onClick={() => setShowMobileFilters(false)}
          />
        )}

        {/* Results */}
        <main className="xl:col-span-9 min-h-[500px]">
          {/* Results header bar */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-400">
                <span className="text-xl font-bold text-white">{count.toLocaleString()}</span>{" "}
                <span className="hidden sm:inline">positions found</span>
                <span className="sm:hidden">results</span>
              </p>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    <Icons.X /> Clear all
                  </button>
                )}
                <div className="relative">
                  <button
                    onClick={() => setSortOpen(!sortOpen)}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 text-gray-300 text-xs rounded-lg pl-8 pr-3 py-2 hover:bg-white/10 hover:border-white/15 focus:outline-none focus:border-blue-500/50 cursor-pointer transition-colors"
                  >
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                      <Icons.Sort />
                    </div>
                    {SORT_OPTIONS.find((o) => o.value === sort)?.label}
                    <Icons.ChevronDown />
                  </button>
                  {sortOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 z-20 bg-[#161b22] border border-white/10 rounded-lg shadow-xl py-1 min-w-[180px]">
                        {SORT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setSort(opt.value);
                              setPage(1);
                              setSortOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                              sort === opt.value
                                ? "bg-blue-500/15 text-blue-300"
                                : "text-gray-300 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowSubscribeModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
                  title="Subscribe to email alerts for these filters"
                >
                  <Icons.Bell />
                  <span className="hidden sm:inline">Alert</span>
                </button>
              </div>
            </div>

            {/* Query Editor */}
            <QueryEditor
              queryText={queryText}
              onQueryChange={handleQueryChange}
              queryError={queryError}
              isLoading={loading}
            />
          </div>

          <div className="grid gap-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <JobSkeleton key={i} />)
            ) : results.length > 0 ? (
              results.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onAiClassify={triggerAiClassify}
                  onViewComparison={openComparison}
                  aiClassifying={aiClassifying}
                />
              ))
            ) : (
              <EmptyState clearAll={clearAll} />
            )}
          </div>

          {/* Pagination */}
          {count > 50 && (
            <Pagination
              page={page}
              totalPages={Math.ceil(count / 50)}
              onPageChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
        </main>
      </div>

      {/* AI Comparison Modal */}
      {(comparisonData || comparisonLoading) && (
        <AiComparisonModal
          data={comparisonData}
          loading={comparisonLoading}
          onClose={() => setComparisonData(null)}
        />
      )}

      <SubscribeModal
        open={showSubscribeModal}
        onClose={() => setShowSubscribeModal(false)}
        criteria={subscribeCriteria}
      />
    </div>
  );
}

// -- Subcomponents --

function FilterSection({ title, type, options, counts, state, onToggleItem, onToggleOperator, limit }: any) {
  const [expanded, setExpanded] = useState(false);
  if (!options || options.length === 0) return null;

  // Separate into three stable groups: active items always shown at top
  const included = options.filter((o: string) => state.include.has(o));
  const excluded = options.filter((o: string) => state.exclude.has(o));
  const neutral = options.filter((o: string) => !state.include.has(o) && !state.exclude.has(o));

  // Apply limit only to neutral items so active items are always visible
  const visibleNeutral = expanded || !limit ? neutral : neutral.slice(0, limit);
  const hiddenNeutralCount = limit ? Math.max(0, neutral.length - visibleNeutral.length) : 0;

  const visibleOptions = [...included, ...excluded, ...visibleNeutral];
  const hasActiveItems = included.length > 0 || excluded.length > 0;

  const canUseAnd = type === "tag" && state.include.size > 1;

  return (
    <div className="py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider !text-[11px] !py-0">{title}</h3>
        {canUseAnd && (
          <button
            onClick={onToggleOperator}
            className="text-[10px] px-2 py-0.5 rounded border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors uppercase font-bold tracking-wider"
            title={`Switch to Match ${state.operator === "AND" ? "ANY" : "ALL"}`}
          >
            Match {state.operator}
          </button>
        )}
      </div>
      <div className="space-y-0.5">
        {visibleOptions.map((opt: string, idx: number) => {
          const isInc = state.include.has(opt);
          const isExc = state.exclude.has(opt);
          const count = counts[opt] || 0;
          // Render a separator between the active group and neutral items
          const isFirstNeutral = hasActiveItems && idx === included.length + excluded.length;

          return (
            <React.Fragment key={opt}>
              {isFirstNeutral && <div className="my-1 border-t border-white/5" />}
              <div
                onClick={() => onToggleItem(opt)}
                className={`
                  flex items-center justify-between group cursor-pointer px-2 py-1.5 rounded-md transition-colors select-none
                  ${
                    isInc
                      ? "bg-blue-500/10 text-blue-100"
                      : isExc
                        ? "bg-red-500/10 text-red-100"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  }
                `}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`
                    w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0
                    ${
                      isInc
                        ? "bg-blue-500 border-blue-500"
                        : isExc
                          ? "bg-red-500 border-red-500"
                          : "border-gray-600 group-hover:border-gray-400"
                    }
                  `}
                  >
                    {isInc && <Icons.Check />}
                    {isExc && <Icons.X />}
                  </div>
                  <span className="text-sm truncate">{opt}</span>
                </div>
                <span className={`text-xs tabular-nums ${isInc ? "text-blue-300" : isExc ? "text-red-300" : "text-gray-600"}`}>
                  {count}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {hiddenNeutralCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-500 hover:text-blue-400 mt-2 px-2 font-medium flex items-center gap-1 transition-colors"
        >
          {expanded ? "Show Less" : `+ ${hiddenNeutralCount} more`}
        </button>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      className={`flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-lg transition-all border text-xs font-medium ${
        checked
          ? "bg-green-500/10 border-green-500/30 text-green-400"
          : "bg-transparent border-transparent hover:bg-white/5 text-gray-400"
      }`}
    >
      <div className="relative flex items-center">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`w-7 h-3.5 rounded-full transition-colors ${checked ? "bg-green-500" : "bg-gray-700"}`}></div>
        <div
          className={`absolute left-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${
            checked ? "translate-x-3.5" : "translate-x-0"
          }`}
        ></div>
      </div>
      <span>{label}</span>
    </label>
  );
}

const formatSalaryDisplay = (job: JobResult) => {
  if (job.salary_label) return job.salary_label;
  if (job.salary_min) {
    const min = (job.salary_min / 1000).toFixed(1).replace(/\.0$/, "");
    if (job.salary_max) {
      if (job.salary_min === job.salary_max) {
        return `${min}k`;
      }
      const max = (job.salary_max / 1000).toFixed(1).replace(/\.0$/, "");
      return `${min}k–${max}k`;
    }
    return `${min}k+`;
  }
  return null;
};

function JobCard({
  job,
  onAiClassify,
  onViewComparison,
  aiClassifying,
}: {
  job: JobResult;
  onAiClassify: (id: number) => void;
  onViewComparison: (id: number) => void;
  aiClassifying: number | null;
}) {
  const salaryLabel = formatSalaryDisplay(job);

  const locations =
    job.locations && job.locations.length > 0 ? job.locations : job.municipality_name ? [job.municipality_name] : [];

  const primaryLocation = locations[0];
  const additionalCount = locations.length - 1;
  const hasMultipleLocations = additionalCount > 0;

  return (
    <div className="group relative p-4 bg-white/[0.03] border border-white/5 rounded-xl hover:border-blue-500/20 hover:bg-white/[0.05] transition-all duration-200 w-full overflow-hidden">
      <div className="flex gap-3 min-w-0">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1.5 mb-1">
            <h3 className="flex-1 min-w-0 text-[15px] font-semibold text-gray-100 group-hover:text-blue-400 transition-colors !text-[15px] !py-0">
              <a
                href={`https://duunitori.fi/tyopaikat/tyo/${job.slug}`}
                target="_blank"
                rel="noreferrer"
                className="focus:outline-none block truncate"
              >
                <span className="absolute inset-0" aria-hidden="true" />
                {job.heading}
              </a>
            </h3>
            <div className="shrink-0 flex items-center gap-2">
              {salaryLabel && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {salaryLabel}
                </span>
              )}
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {new Date(job.date_posted).toLocaleDateString("fi-FI")}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-2.5 flex items-center gap-2 overflow-hidden">
            <span className="font-medium text-gray-300 truncate">{job.company_name}</span>
            {primaryLocation && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                <span className="relative z-10 flex items-center gap-1 shrink-0">
                  <Icons.MapPin />
                  <span>{primaryLocation}</span>
                  {hasMultipleLocations && (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 cursor-help"
                      title={locations.join(", ")}
                    >
                      +{additionalCount}
                    </span>
                  )}
                </span>
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5 items-center">
            <div className="flex flex-wrap gap-1.5 pointer-events-none">
              {job.work_mode && job.work_mode !== "unknown" && (
                <Badge color={job.work_mode === "remote" ? "green" : job.work_mode === "hybrid" ? "amber" : "blue"}>
                  {job.work_mode}
                </Badge>
              )}
              {job.seniority && <Badge color="purple">{job.seniority}</Badge>}
            </div>
            <div className="relative z-10 ml-auto">
              {job.ai_classified_at ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onViewComparison(job.id);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
                  title="View AI vs Manual keyword comparison"
                >
                  <Icons.Sparkle /> Compare
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAiClassify(job.id);
                  }}
                  disabled={aiClassifying === job.id}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-wait"
                  title="Run AI keyword detection with Gemini"
                >
                  {aiClassifying === job.id ? (
                    <>
                      <span className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                      Classifying...
                    </>
                  ) : (
                    <>
                      <Icons.Sparkle /> AI Detect
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: "purple" | "amber" | "blue" | "green" }) {
  const styles = {
    purple: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    blue: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-medium border capitalize ${styles[color]}`}>{children}</span>
  );
}

function JobSkeleton() {
  return (
    <div className="p-4 bg-white/[0.03] border border-white/5 rounded-xl animate-pulse">
      <div className="h-4 bg-white/10 rounded w-3/4 mb-3"></div>
      <div className="h-3.5 bg-white/5 rounded w-1/3 mb-3"></div>
      <div className="flex gap-2">
        <div className="h-5 w-14 bg-white/5 rounded"></div>
        <div className="h-5 w-18 bg-white/5 rounded"></div>
      </div>
    </div>
  );
}

function EmptyState({ clearAll }: { clearAll: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 border border-dashed border-white/10 bg-white/[0.02] rounded-xl text-gray-500">
      <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-600">
        <Icons.Search />
      </div>
      <p className="text-base font-medium text-gray-300">No matches found</p>
      <button onClick={clearAll} className="text-blue-400 hover:text-blue-300 text-sm font-medium hover:underline mt-2">
        Clear all filters
      </button>
    </div>
  );
}

function QueryEditor({
  queryText,
  onQueryChange,
  queryError,
  isLoading,
}: {
  queryText: string;
  onQueryChange: (text: string) => void;
  queryError: string | null;
  isLoading: boolean;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-2 text-gray-400">
          <Icons.Code />
          <span className="text-xs font-medium">Query</span>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <span className="text-xs text-gray-500 animate-pulse">Searching...</span>}
          {queryError && (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <Icons.X /> {queryError}
            </span>
          )}
          {!queryError && !isLoading && queryText.trim() && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Icons.Check /> Valid
            </span>
          )}
        </div>
      </div>

      <div className="p-3">
        <textarea
          value={queryText}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={
            'Example:\n(languages:"Python" AND languages:"TypeScript")\nNOT workMode:"onsite"'
          }
          className={`w-full h-20 bg-[#0d1117] border rounded-lg p-3 font-mono text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none transition-colors ${
            queryError ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"
          }`}
          spellCheck={false}
        />

        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 select-none">
            Syntax reference
          </summary>
          <div className="mt-2 text-xs text-gray-500 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 pl-2 border-l border-white/10">
            <p>
              <code className="text-purple-400">category:&quot;value&quot;</code> — Include
            </p>
            <p>
              <code className="text-red-400">NOT category:&quot;value&quot;</code> — Exclude
            </p>
            <p>
              <code className="text-blue-400">AND</code> / <code className="text-green-400">OR</code> — Combine
            </p>
            <p>
              <code className="text-amber-400">(a AND b) OR (c AND d)</code> — Group
            </p>
            <p className="sm:col-span-2 mt-1 text-gray-600">
              Categories: languages, frameworks, databases, cloud, devops, dataScience, cyberSecurity, positions,
              softSkills, locations, workMode, seniority, companies
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}

// -- AI Comparison Modal --

const COMPARISON_CATEGORIES = [
  { key: "languages", label: "Languages" },
  { key: "frameworks", label: "Frameworks" },
  { key: "databases", label: "Databases" },
  { key: "cloud", label: "Cloud" },
  { key: "devops", label: "DevOps", aiKey: "devOps" },
  { key: "cyberSecurity", label: "Cyber Security" },
  { key: "dataScience", label: "Data Science" },
  { key: "roles", label: "Roles", aiKey: "roles", dbCategory: "positions" },
  { key: "softSkills", label: "Soft Skills" },
  { key: "locations", label: "Locations" },
  { key: "seniority", label: "Seniority" },
  { key: "workMode", label: "Work Mode" },
  { key: "salary", label: "Salary" },
];

function AiComparisonModal({
  data,
  loading,
  onClose,
}: {
  data: ComparisonData | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (!loading && !data) return null;

  const manualByCategory: Record<string, string[]> = {};
  const aiByCategory: Record<string, AiTag[]> = {};

  if (data) {
    // Group manual tags
    for (const tag of data.manual.tags) {
      if (!manualByCategory[tag.category]) manualByCategory[tag.category] = [];
      manualByCategory[tag.category].push(tag.keyword);
    }
    // Add seniority and workMode from job columns
    if (data.manual.seniority) {
      manualByCategory["seniority"] = [data.manual.seniority];
    }
    if (data.manual.workMode) {
      manualByCategory["workMode"] = [data.manual.workMode];
    }

    // Group AI tags
    for (const tag of data.ai.tags) {
      // Map DB category back to comparison key
      const cat = tag.category;
      if (!aiByCategory[cat]) aiByCategory[cat] = [];
      aiByCategory[cat].push(tag);
    }
  }

  // Compute stats
  let totalManual = 0;
  let totalAi = 0;
  let matchCount = 0;
  let aiOnlyCount = 0;
  let manualOnlyCount = 0;

  if (data) {
    for (const cat of COMPARISON_CATEGORIES) {
      const manualKws = new Set((manualByCategory[cat.key] || []).map((k) => k.toLowerCase()));
      const aiKws = new Set((aiByCategory[cat.aiKey || cat.key] || []).map((t) => t.keyword.toLowerCase()));
      totalManual += manualKws.size;
      totalAi += aiKws.size;
      for (const k of aiKws) {
        if (manualKws.has(k)) matchCount++;
        else aiOnlyCount++;
      }
      for (const k of manualKws) {
        if (!aiKws.has(k)) manualOnlyCount++;
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white !text-lg !py-0">AI vs Manual Keyword Comparison</h2>
            {data && (
              <p className="text-sm text-gray-400 mt-0.5">{data.heading} — {data.company_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Icons.XLarge />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <span className="w-6 h-6 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
              <span className="ml-3 text-gray-400">Loading comparison...</span>
            </div>
          ) : data && !data.ai_classified_at ? (
            <div className="text-center py-20 text-gray-500">
              <p>This job has not been AI-classified yet.</p>
            </div>
          ) : data ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard label="Manual Keywords" value={totalManual} color="blue" />
                <StatCard label="AI Keywords" value={totalAi} color="violet" />
                <StatCard label="Matching" value={matchCount} color="green" />
                <StatCard label="AI Only" value={aiOnlyCount} color="amber" />
              </div>

              {/* Category-by-category comparison */}
              <div className="space-y-4">
                {COMPARISON_CATEGORIES.map((cat) => {
                  const manualKws = manualByCategory[cat.key] || [];
                  const aiTags = aiByCategory[cat.aiKey || cat.key] || [];
                  if (manualKws.length === 0 && aiTags.length === 0) return null;

                  const manualSet = new Set(manualKws.map((k) => k.toLowerCase()));
                  const aiSet = new Set(aiTags.map((t) => t.keyword.toLowerCase()));

                  return (
                    <div key={cat.key} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3 !text-sm !py-0">{cat.label}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Manual column */}
                        <div>
                          <p className="text-[11px] font-medium text-blue-400 uppercase tracking-wider mb-2">Manual / Heuristic</p>
                          <div className="flex flex-wrap gap-1.5">
                            {manualKws.length === 0 ? (
                              <span className="text-xs text-gray-600 italic">None detected</span>
                            ) : (
                              manualKws.map((kw) => (
                                <span
                                  key={kw}
                                  className={`px-2 py-0.5 rounded text-xs font-medium border ${
                                    aiSet.has(kw.toLowerCase())
                                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                      : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                                  }`}
                                >
                                  {kw}
                                  {!aiSet.has(kw.toLowerCase()) && (
                                    <span className="ml-1 text-[10px] opacity-60">manual only</span>
                                  )}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                        {/* AI column */}
                        <div>
                          <p className="text-[11px] font-medium text-violet-400 uppercase tracking-wider mb-2">AI (Gemini)</p>
                          <div className="flex flex-wrap gap-1.5">
                            {aiTags.length === 0 ? (
                              <span className="text-xs text-gray-600 italic">None detected</span>
                            ) : (
                              aiTags.map((tag) => (
                                <span
                                  key={tag.keyword}
                                  className={`group relative px-2 py-0.5 rounded text-xs font-medium border cursor-help ${
                                    manualSet.has(tag.keyword.toLowerCase())
                                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                      : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                  }`}
                                  title={tag.origin || ""}
                                >
                                  {tag.keyword}
                                  {!manualSet.has(tag.keyword.toLowerCase()) && (
                                    <span className="ml-1 text-[10px] opacity-60">AI only</span>
                                  )}
                                  {tag.origin && (
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-white/10 text-gray-300 text-xs rounded-lg shadow-xl max-w-xs whitespace-normal hidden group-hover:block z-10">
                                      {tag.origin}
                                    </span>
                                  )}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
                  Both agree
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/30" />
                  Manual only
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/30" />
                  AI only (hover for origin)
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const getVisiblePages = (): (number | "...")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [];
    if (page <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("...", totalPages);
    } else if (page >= totalPages - 3) {
      pages.push(1, "...");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6 mb-2">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-2 text-xs font-medium rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
      >
        Prev
      </button>
      {getVisiblePages().map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 py-2 text-xs text-gray-600">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`min-w-[36px] px-2 py-2 text-xs font-medium rounded-lg border transition-colors ${
              p === page
                ? "bg-blue-500/15 border-blue-500/30 text-blue-300"
                : "border-white/10 text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-2 text-xs font-medium rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
      >
        Next
      </button>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: "blue" | "violet" | "green" | "amber" }) {
  const styles = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-300",
    violet: "bg-violet-500/10 border-violet-500/20 text-violet-300",
    green: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-300",
  };
  return (
    <div className={`rounded-xl border p-3 text-center ${styles[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[11px] opacity-70 mt-0.5">{label}</p>
    </div>
  );
}
