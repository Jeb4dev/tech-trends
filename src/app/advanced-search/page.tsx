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
  locations?: string[]; // Array of city names from location tags
}

interface CategoryConfigItem {
  key: string;
  title: string;
  type: "tag" | "column"; // Columns (workMode, seniority) don't support AND operator
  options?: string[];
  source?: (string | string[])[];
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
  { key: "positions", title: "Role / Position", type: "tag", source: positions },
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
  Edit: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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

    // Handle includes
    if (state.include.size > 0) {
      const includeItems = Array.from(state.include).map((item) => `${cat.key}:"${item}"`);
      if (includeItems.length === 1) {
        categoryParts.push(includeItems[0]);
      } else {
        const joined = includeItems.join(` ${state.operator} `);
        categoryParts.push(`(${joined})`);
      }
    }

    // Handle excludes
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

// Parse query and extract filters (for simple mode compatibility)
function parseQueryToFilters(query: string): FilterState | null {
  try {
    const newFilters = INITIAL_FILTER_STATE();

    // Normalize line breaks and clean up
    const normalized = query.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    if (!normalized) return newFilters;

    // Extract all tokens: categoryKey:"value" with optional NOT prefix
    const tokenRegex = /(NOT\s+)?(\w+):"([^"]+)"/g;

    // Parse all tokens
    let match;
    while ((match = tokenRegex.exec(normalized)) !== null) {
      const isNot = !!match[1];
      const categoryKey = match[2];
      const value = match[3];

      // Check if this is a valid category
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

  // Check for balanced parentheses
  let parenCount = 0;
  for (const char of normalized) {
    if (char === "(") parenCount++;
    if (char === ")") parenCount--;
    if (parenCount < 0) return { valid: false, error: "Unbalanced parentheses" };
  }
  if (parenCount !== 0) return { valid: false, error: "Unbalanced parentheses" };

  // Check for balanced quotes
  const quoteCount = (normalized.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) return { valid: false, error: "Unbalanced quotes" };

  // Check that all tokens have valid category keys
  const tokenRegex = /(NOT\s+)?(\w+):"([^"]+)"/g;
  let match;
  let hasValidToken = false;

  while ((match = tokenRegex.exec(normalized)) !== null) {
    const categoryKey = match[2];
    const catConfig = CATEGORY_CONFIG.find((c) => c.key === categoryKey);
    if (!catConfig) return { valid: false, error: `Unknown category: ${categoryKey}` };
    hasValidToken = true;
  }

  // If there's content but no valid tokens, check if it's just whitespace/operators
  if (normalized && !hasValidToken) {
    // Allow just operators and parens
    const cleanedForCheck = normalized.replace(/\b(AND|OR|NOT)\b/g, "").replace(/[()]/g, "").trim();
    if (cleanedForCheck) return { valid: false, error: "Invalid syntax" };
  }

  return { valid: true };
}

// Convert query to API parameters - handles complex queries
function queryToApiParams(query: string): URLSearchParams {
  const params = new URLSearchParams();
  const normalized = query.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

  if (!normalized) return params;

  // For complex queries, we send the raw query for server-side parsing
  // The server should handle this, but for now we'll extract what we can

  // Extract all tokens with their context
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

  // Set params
  Object.entries(categoryIncludes).forEach(([key, values]) => {
    params.set(`${key}_in`, values.join(","));
  });

  Object.entries(categoryExcludes).forEach(([key, values]) => {
    params.set(`${key}_ex`, values.join(","));
  });

  // Send the raw query for advanced parsing on server
  params.set("rawQuery", normalized);

  return params;
}

// Update query when user clicks sidebar - tries to preserve complex structure
function updateQueryWithToggle(
  currentQuery: string,
  categoryKey: string,
  value: string,
  nowIncluded: boolean,
  nowExcluded: boolean
): string {
  const normalized = currentQuery.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

  // Escape special regex characters in value
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Remove existing token for this value (both include and exclude variants)
  let updated = normalized
    .replace(new RegExp(`\\s*AND\\s+NOT\\s+${categoryKey}:"${escapedValue}"`, 'g'), '')
    .replace(new RegExp(`\\s*OR\\s+NOT\\s+${categoryKey}:"${escapedValue}"`, 'g'), '')
    .replace(new RegExp(`NOT\\s+${categoryKey}:"${escapedValue}"\\s*AND\\s*`, 'g'), '')
    .replace(new RegExp(`NOT\\s+${categoryKey}:"${escapedValue}"\\s*OR\\s*`, 'g'), '')
    .replace(new RegExp(`NOT\\s+${categoryKey}:"${escapedValue}"`, 'g'), '')
    .replace(new RegExp(`\\s*AND\\s+${categoryKey}:"${escapedValue}"`, 'g'), '')
    .replace(new RegExp(`\\s*OR\\s+${categoryKey}:"${escapedValue}"`, 'g'), '')
    .replace(new RegExp(`${categoryKey}:"${escapedValue}"\\s*AND\\s*`, 'g'), '')
    .replace(new RegExp(`${categoryKey}:"${escapedValue}"\\s*OR\\s*`, 'g'), '')
    .replace(new RegExp(`${categoryKey}:"${escapedValue}"`, 'g'), '');

  // Clean up empty parentheses and dangling operators
  updated = updated
    .replace(/\(\s*\)/g, '')
    .replace(/^\s*AND\s+/i, '')
    .replace(/^\s*OR\s+/i, '')
    .replace(/\s+AND\s*$/i, '')
    .replace(/\s+OR\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Add new token if needed
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
  const [loading, setLoading] = useState(false);
  const [facetCounts, setFacetCounts] = useState<Record<string, Record<string, number>>>({});

  // Query is the source of truth - always advanced mode
  const [queryText, setQueryText] = useState("");
  const [queryError, setQueryError] = useState<string | null>(null);

  // Additional filters
  const [hideDeleted, setHideDeleted] = useState(true);
  const [hideOld, setHideOld] = useState(true);
  const [sort, setSort] = useState("date_desc");

  // Mobile Menu
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Parse query to extract filter state for sidebar display
  const filters = useMemo(() => parseQueryToFilters(queryText) || INITIAL_FILTER_STATE(), [queryText]);

  // Validate query syntax on change
  useEffect(() => {
    const validation = validateQuerySyntax(queryText);
    setQueryError(validation.valid ? null : (validation.error || "Invalid syntax"));
  }, [queryText]);

  const handleQueryChange = (value: string) => {
    setQueryText(value);
  };

  // Toggle item from sidebar - updates the query text directly
  const toggleItem = (categoryKey: string, value: string) => {
    const currentFilters = parseQueryToFilters(queryText) || INITIAL_FILTER_STATE();
    const cat = currentFilters[categoryKey];

    // Cycle: Include -> Exclude -> Neutral
    if (cat.include.has(value)) {
      cat.include.delete(value);
      cat.exclude.add(value);
    } else if (cat.exclude.has(value)) {
      cat.exclude.delete(value);
    } else {
      cat.include.add(value);
    }

    // Regenerate query from updated filters, but preserve complex structure if possible
    const newQuery = updateQueryWithToggle(queryText, categoryKey, value, cat.include.has(value), cat.exclude.has(value));
    setQueryText(newQuery);
  };

  // Clear all filters
  const clearAll = () => {
    setQueryText("");
    setQueryError(null);
  };

  // -- Memoized Options --
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

  // -- Fetch Logic --
  useEffect(() => {
    const fetchJobs = async () => {
      // Don't fetch if there's a syntax error
      if (queryError) return;

      setLoading(true);
      try {
        const params = queryToApiParams(queryText);
        params.set("hideDeleted", hideDeleted.toString());
        params.set("hideOld", hideOld.toString());
        params.set("sort", sort);
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
  }, [queryText, queryError, hideDeleted, hideOld, sort]);

  // Toggle operator for sidebar (modifies query string)
  const toggleOperator = (categoryKey: string) => {
    // Parse current filters
    const currentFilters = parseQueryToFilters(queryText) || INITIAL_FILTER_STATE();
    const cat = currentFilters[categoryKey];

    // Toggle operator
    cat.operator = cat.operator === "AND" ? "OR" : "AND";

    // Regenerate query with new operator
    const newQuery = generateQueryString({...currentFilters, [categoryKey]: cat});
    setQueryText(newQuery);
  };


  const activeFilterCount = Object.values(filters).reduce((acc, c) => acc + c.include.size + c.exclude.size, 0);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white tracking-tight">Advanced Search</h1>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full px-1 p-1">
              <Toggle label="Hide Deleted" checked={hideDeleted} onChange={setHideDeleted} />
              <Toggle label="< 90 Days" checked={hideOld} onChange={setHideOld} />
            </div>
          </div>
          <div className="md:hidden">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-md"
            >
              <Icons.Filter />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto px-4 py-6 grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Sidebar */}
        <aside
          className={`
          fixed inset-0 z-30 bg-[#1a212c] p-6 overflow-y-auto transition-transform duration-300 ease-in-out xl:translate-x-0 xl:static xl:z-0 xl:p-0 xl:bg-transparent xl:col-span-3 xl:block xl:h-[calc(100vh-8rem)] xl:overflow-y-auto xl:sticky xl:top-24 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10
          ${showMobileFilters ? "translate-x-0" : "-translate-x-full"}
        `}
        >
          <div className="flex items-center justify-between xl:hidden mb-6">
            <h2 className="text-xl font-bold text-white">Filters</h2>
            <button onClick={() => setShowMobileFilters(false)} className="p-2 text-gray-400">
              <Icons.X />
            </button>
          </div>

          <div className="xl:hidden mb-8 flex flex-col gap-3">
            <Toggle label="Hide Deleted" checked={hideDeleted} onChange={setHideDeleted} />
            <Toggle label="Hide Old Jobs" checked={hideOld} onChange={setHideOld} />
          </div>

          <div className="space-y-1 mr-2">
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
        </aside>

        {/* Results */}
        <main className="xl:col-span-9 min-h-[500px]">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl text-gray-100 font-medium">
                <span className="font-bold">{count}</span> Positions Found
              </h2>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-red-900/10 transition-colors mr-auto sm:mr-0"
                  >
                    <Icons.X /> Clear all
                  </button>
                )}
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                    <Icons.Sort />
                  </div>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="appearance-none bg-[#1a212c] border border-white/10 text-gray-300 text-sm rounded-lg pl-9 pr-10 py-2 focus:outline-none focus:border-blue-500/50 cursor-pointer w-full sm:w-auto"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Query Editor - Always Visible */}
            <QueryEditor
              queryText={queryText}
              onQueryChange={handleQueryChange}
              queryError={queryError}
              isLoading={loading}
            />
          </div>

          <div className="grid gap-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <JobSkeleton key={i} />)
            ) : results.length > 0 ? (
              results.map((job) => <JobCard key={job.id} job={job} />)
            ) : (
              <EmptyState clearAll={clearAll} />
            )}
          </div>
        </main>
      </div>
      {showMobileFilters && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-20 xl:hidden"
          onClick={() => setShowMobileFilters(false)}
        />
      )}
    </div>
  );
}

// -- Subcomponents --

function FilterSection({ title, type, options, counts, state, onToggleItem, onToggleOperator, limit }: any) {
  const [expanded, setExpanded] = useState(false);
  const visibleOptions = expanded || !limit ? options : options.slice(0, limit);
  if (!options || options.length === 0) return null;

  const canUseAnd = type === "tag" && state.include.size > 1;

  return (
    <div className="py-4 border-b border-gray-800 last:border-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</h3>
        {canUseAnd && (
          <button
            onClick={onToggleOperator}
            className="text-[10px] px-2 py-0.5 rounded border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors uppercase font-bold tracking-wider"
            title={`Switch to Match ${state.operator === "AND" ? "ANY" : "ALL"}`}
          >
            Match {state.operator}
          </button>
        )}
      </div>
      <div className="space-y-1">
        {visibleOptions.map((opt: string) => {
          const isInc = state.include.has(opt);
          const isExc = state.exclude.has(opt);
          const count = counts[opt] || 0;

          return (
            <div
              key={opt}
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
              <span className={`text-xs ${isInc ? "text-blue-300" : isExc ? "text-red-300" : "text-gray-600"}`}>
                {count}
              </span>
            </div>
          );
        })}
      </div>
      {limit && options.length > limit && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-500 hover:text-blue-400 mt-2 px-2 font-medium flex items-center gap-1 transition-colors"
        >
          {expanded ? "Show Less" : `+ ${options.length - limit} more`}
        </button>
      )}
    </div>
  );
}


function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      className={`flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-full transition-all border ${
        checked ? "bg-green-500/10 border-green-500/30" : "bg-transparent border-transparent hover:bg-white/5"
      }`}
    >
      <div className="relative flex items-center">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`w-8 h-4 rounded-full transition-colors ${checked ? "bg-green-500" : "bg-gray-700"}`}></div>
        <div
          className={`absolute left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        ></div>
      </div>
      <span className={`text-xs font-medium ${checked ? "text-green-400" : "text-gray-400"}`}>{label}</span>
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

function JobCard({ job }: { job: JobResult }) {
  const salaryLabel = formatSalaryDisplay(job);

  // Determine locations to display
  // Use locations array from tags if available, otherwise fall back to municipality_name
  const locations = job.locations && job.locations.length > 0
    ? job.locations
    : (job.municipality_name ? [job.municipality_name] : []);

  const primaryLocation = locations[0];
  const additionalCount = locations.length - 1;
  const hasMultipleLocations = additionalCount > 0;

  return (
    <div className="group relative p-5 bg-[#1a212c] border border-white/5 rounded-xl hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-900/5 transition-all duration-200 w-full overflow-hidden">
      <div className="flex gap-4 min-w-0">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-1">
            <h3 className="flex-1 min-w-0 text-lg font-semibold text-gray-100 group-hover:text-blue-400 transition-colors">
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
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {salaryLabel}
                </span>
              )}
              <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(job.date_posted).toLocaleDateString("fi-FI")}</span>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-3 flex items-center gap-2 overflow-hidden">
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
          <div className="flex flex-wrap gap-2 relative z-10 pointer-events-none">
            {job.work_mode && job.work_mode !== "unknown" && (
              <Badge color={job.work_mode === "remote" ? "green" : job.work_mode === "hybrid" ? "amber" : "blue"}>
                {job.work_mode}
              </Badge>
            )}
            {job.seniority && <Badge color="purple">{job.seniority}</Badge>}
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
    <div className="p-5 bg-[#1a212c] border border-white/5 rounded-xl animate-pulse">
      <div className="h-5 bg-white/10 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-white/5 rounded w-1/3 mb-4"></div>
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-white/5 rounded"></div>
        <div className="h-6 w-20 bg-white/5 rounded"></div>
      </div>
    </div>
  );
}

function EmptyState({ clearAll }: { clearAll: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-800 bg-white/[0.02] rounded-xl text-gray-500">
      <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4 text-gray-600">
        <Icons.Search />
      </div>
      <p className="text-lg font-medium text-gray-300">No matches found</p>
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
    <div className="bg-[#1a212c] border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Icons.Code />
          <span className="text-sm font-medium text-gray-300">Query</span>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="text-xs text-gray-500 animate-pulse">Searching...</span>
          )}
          {queryError && (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <Icons.X /> {queryError}
            </span>
          )}
          {!queryError && !isLoading && queryText.trim() && (
            <span className="text-xs text-green-400">✓ Valid</span>
          )}
        </div>
      </div>

      <div className="p-3">
        <textarea
          value={queryText}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={'Example:\n(languages:"Python" AND languages:"TypeScript") OR (languages:"JavaScript" AND languages:"Golang")\nNOT workMode:"onsite"'}
          className={`w-full h-24 bg-[#0d1117] border rounded-lg p-3 font-mono text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none transition-colors ${
            queryError 
              ? "border-red-500/50 focus:border-red-500" 
              : "border-white/10 focus:border-purple-500/50"
          }`}
          spellCheck={false}
        />

        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 select-none">
            Syntax reference
          </summary>
          <div className="mt-2 text-xs text-gray-500 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 pl-2 border-l border-white/10">
            <p><code className="text-purple-400">category:&quot;value&quot;</code> — Include</p>
            <p><code className="text-red-400">NOT category:&quot;value&quot;</code> — Exclude</p>
            <p><code className="text-blue-400">AND</code> / <code className="text-green-400">OR</code> — Combine</p>
            <p><code className="text-amber-400">(a AND b) OR (c AND d)</code> — Group</p>
            <p className="sm:col-span-2 mt-1">
              <span className="text-gray-400">Example:</span> <code className="text-cyan-400">(languages:&quot;Python&quot; AND languages:&quot;React&quot;) OR languages:&quot;Rust&quot;</code>
            </p>
            <p className="sm:col-span-2 text-gray-600 mt-1">
              Categories: languages, frameworks, databases, cloud, devops, dataScience, cyberSecurity, positions, softSkills, locations, workMode, seniority, companies
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}

