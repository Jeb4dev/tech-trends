"use client";

import Link from "next/link";
import { Skills } from "./skill";
import { Category, Data, QueryParams, ResponseData, Results } from "@/types";
import { useEffect, useState, Suspense, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { frameworks, languages } from "@/keywords"; // minimal imports kept if needed elsewhere
import { Openings } from "./openings";
import { computeBase } from "@/compute"; // optional fallback if API doesn't send base
import type { SlimBase } from "@/compute";
import ActiveOpeningsAreaChart from "./active-area-chart";
import ExtraCharts from "./extra-charts";

// -----------------------------------------------------------------------------

function TrendsPageInner() {
  const [data, setData] = useState<ResponseData>({ count: 0, next: null, previous: null, results: [] });
  const [precomputedSlim, setPrecomputedSlim] = useState<SlimBase | null>(null);
  const [isLoading, setLoading] = useState(false);
  const params = useSearchParams();
  const [queryParams, setQueryParams] = useState<QueryParams>({
    languages: params.getAll("languages").map((q) => q.toLowerCase()),
    frameworks: params.getAll("frameworks").map((q) => q.toLowerCase()),
    databases: params.getAll("databases").map((q) => q.toLowerCase()),
    cloud: params.getAll("cloud").map((q) => q.toLowerCase()),
    devops: params.getAll("devops").map((q) => q.toLowerCase()),
    dataScience: params.getAll("dataScience").map((q) => q.toLowerCase()),
    cyberSecurity: params.getAll("cyberSecurity").map((q) => q.toLowerCase()),
    softSkills: params.getAll("softSkills").map((q) => q.toLowerCase()),
    positions: params.getAll("positions").map((q) => q.toLowerCase()),
    seniority: params.getAll("seniority").map((q) => q.toLowerCase()),
    workMode: params.getAll("workMode").map(q => q.toLowerCase()),
    companies: params.getAll("companies").map((q) => q.toLowerCase()),
    locations: params.getAll("locations").map((q) => q.toLowerCase()),
    cities: params.getAll("cities").map((q) => q.toLowerCase()),
    salary: params.getAll("salary").map((q) => q.toLowerCase()),
    minDate: [params.getAll("minDate")[0]],
    maxDate: [params.getAll("maxDate")[0]],
    activeToday: params.getAll("activeToday").map((q) => q.toLowerCase()),
  });

  useEffect(() => {
    setLoading(true);
    fetch("/api/v1")
      .then((res) => res.json())
      .then((payload) => {
        const incoming: ResponseData = payload.data;
        incoming.results.forEach((r) => {
          if (!r._headingLower) r._headingLower = r.heading.toLowerCase();
          if (!r._descrLower) r._descrLower = r.descr.toLowerCase();
        });
        setData(incoming);
        if (payload.base) setPrecomputedSlim(payload.base as SlimBase);
        setLoading(false);
      });
  }, []);

  const baseCategories = useMemo(() => {
    if (precomputedSlim && data.results.length) {
      const byId = new Map<number, Results>();
      data.results.forEach((o) => byId.set(o.id, o));
      const makeCats = (arr: { label: string; ids: number[] }[] | undefined) =>
        (arr || []).map((c) => ({
          label: c.label,
          active: false,
          openings: c.ids.map((id) => byId.get(id)!).filter(Boolean),
          filteredOpenings: [],
        }));
      return {
        categories: {
          languages: makeCats(precomputedSlim.categories.languages),
          frameworks: makeCats(precomputedSlim.categories.frameworks),
          databases: makeCats(precomputedSlim.categories.databases),
          cloud: makeCats(precomputedSlim.categories.cloud),
          devops: makeCats(precomputedSlim.categories.devops),
          dataScience: makeCats(precomputedSlim.categories.dataScience),
          softSkills: makeCats(precomputedSlim.categories.softSkills),
          cyberSecurity: makeCats(precomputedSlim.categories.cyberSecurity),
          positions: makeCats(precomputedSlim.categories.positions),
          seniority: makeCats(precomputedSlim.categories.seniority),
          workMode: makeCats(precomputedSlim.categories.workMode),
          cities: makeCats(precomputedSlim.categories.cities),
          salary: makeCats(precomputedSlim.categories.salary),
        },
        companies: makeCats(precomputedSlim.companies),
        locations: makeCats(precomputedSlim.locations),
      };
    }
    if (!data.results.length) {
      return {
        categories: {
          languages: [],
          frameworks: [],
          databases: [],
          cloud: [],
          devops: [],
          dataScience: [],
          cyberSecurity: [],
          softSkills: [],
          positions: [],
          seniority: [],
          workMode: [],
          cities: [],
        } as Data,
        companies: [] as Category[],
        locations: [] as Category[],
      };
    }
    return computeBase(data.results);
  }, [precomputedSlim, data.results]);

  // Filter categories + compute filtered openings on query changes
  const { filteredData, filteredCategories, filteredCompanies } = useMemo(() => {
    const { categories, companies, locations } = baseCategories;
    if (!data.results) return { filteredData: [], filteredCategories: {} as Data, filteredCompanies: [] };

    const clone = (c: Category) => ({ ...c, openings: c.openings, filteredOpenings: c.filteredOpenings, active: false });

    type CatProcess = { list: Category[] | undefined; selected: string[] | undefined; key: keyof Data | 'companies' | 'locations' };
    const catConfigs: CatProcess[] = [
      { list: categories.languages, selected: queryParams.languages, key: 'languages' },
      { list: categories.frameworks, selected: queryParams.frameworks, key: 'frameworks' },
      { list: categories.databases, selected: queryParams.databases, key: 'databases' },
      { list: categories.cloud, selected: queryParams.cloud, key: 'cloud' },
      { list: categories.devops, selected: queryParams.devops, key: 'devops' },
      { list: categories.dataScience, selected: queryParams.dataScience, key: 'dataScience' },
      { list: categories.cyberSecurity, selected: queryParams.cyberSecurity, key: 'cyberSecurity' },
      { list: categories.softSkills, selected: queryParams.softSkills, key: 'softSkills' },
      { list: categories.positions, selected: queryParams.positions, key: 'positions' },
      { list: categories.seniority, selected: queryParams.seniority, key: 'seniority' },
      { list: categories.workMode, selected: queryParams.workMode, key: 'workMode' },
      { list: categories.cities, selected: queryParams.cities, key: 'cities' },
      { list: categories.salary, selected: queryParams.salary, key: 'salary' },
      { list: companies, selected: queryParams.companies, key: 'companies' },
      { list: locations, selected: queryParams.locations, key: 'locations' },
    ];

    const processed: Record<string, Category[]> = {};
    const activeSets: Results[][] = [];

    for (const cfg of catConfigs) {
      if (!cfg.list) { processed[cfg.key] = []; continue; }
      const selectedLower = (cfg.selected || []).map(s => s.toLowerCase());
      processed[cfg.key] = cfg.list.map(item => {
        const active = selectedLower.includes(item.label.toLowerCase());
        if (active) activeSets.push(item.openings);
        return { ...clone(item), active };
      });
    }

    function intersectArrays(arrays: Results[][]): Results[] {
      if (!arrays.length) return data.results;
      arrays.sort((a,b)=> a.length - b.length);
      let result = arrays[0];
      for (let i=1;i<arrays.length;i++) {
        const set = new Set(arrays[i]);
        result = result.filter(o => set.has(o));
        if (!result.length) break;
      }
      return result;
    }

    let openings = intersectArrays(activeSets);

    if (queryParams.activeToday && queryParams.activeToday.length) {
      const today = new Date();
      const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
      const isSameLocalDate = (iso?: string) => {
        if (!iso) return false;
        const dt = new Date(iso);
        return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
      };
      openings = openings.filter(o => isSameLocalDate(o.last_seen_at));
    }

    const openingsSet = openings === data.results ? null : new Set(openings);

    const attachFiltered = (list: Category[]) => list.map(item => ({
      ...item,
      filteredOpenings: openingsSet ? item.openings.filter(o => openingsSet.has(o)) : item.openings,
    }));

    const filteredCategories: Data = {
      languages: attachFiltered(processed.languages),
      frameworks: attachFiltered(processed.frameworks),
      databases: attachFiltered(processed.databases),
      cloud: attachFiltered(processed.cloud),
      devops: attachFiltered(processed.devops),
      dataScience: attachFiltered(processed.dataScience),
      softSkills: attachFiltered(processed.softSkills),
      cyberSecurity: attachFiltered(processed.cyberSecurity),
      positions: attachFiltered(processed.positions),
      seniority: attachFiltered(processed.seniority),
      workMode: attachFiltered(processed.workMode),
      cities: attachFiltered(processed.cities),
      salary: attachFiltered(processed.salary),
    };

    const filteredCompanies = attachFiltered(processed.companies);

    return { filteredData: openings, filteredCategories, filteredCompanies, filteredLocations: attachFiltered(processed.locations) };
  }, [baseCategories, queryParams, data.results]);

  const updateFilter = useCallback((filter: string, value: string) => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    const isSingleValue = filter === "minDate" || filter === "maxDate" || filter === "activeToday";
    if (isSingleValue) {
      if (filter === 'activeToday') {
        if (params.has('activeToday')) params.delete('activeToday');
        else params.set('activeToday', '1');
      } else {
        if (params.get(filter) === value) params.delete(filter); else params.set(filter, value);
      }
    } else {
      const existing = params.getAll(filter);
      if (existing.includes(value)) {
        const remaining = existing.filter((v) => v !== value);
        params.delete(filter);
        remaining.forEach((v) => params.append(filter, v));
      } else {
        params.append(filter, value);
      }
    }
    setQueryParams((prev) => ({ ...prev, [filter]: params.getAll(filter).map((v) => v.toLowerCase()) }));
    url.search = params.toString();
    window.history.pushState({}, "", url.toString());
  }, []);

  const [today, setToday] = useState<string>("");
  useEffect(() => {
    setToday(new Date().toLocaleDateString("fi-FI"));
  }, []);

  const [showMoreGraphs, setShowMoreGraphs] = useState(false);

  if (isLoading)
    return (
      <div className={"max-w-7xl mx-auto px-3 md:px-6 lg:px-8"}>
        <div>
          <div className={"flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-4"}>
            <h1 className="text-2xl md:text-3xl font-semibold">Job Listings <span className="ml-2 text-sm font-normal text-gray-500 animate-pulse">(loading)</span></h1>
            <div className="flex flex-col sm:items-end gap-1">
              <div className="h-3 w-64 md:w-80 rounded bg-gray-700/40 animate-pulse" />
              <div className="h-3 w-40 rounded bg-gray-700/40 animate-pulse" />
            </div>
            <div className="h-5 w-28 rounded bg-gray-700/40 animate-pulse" />
          </div>

          <div className={"mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6"}>
            <div><h2 className="text-sm font-semibold mb-1">Languages</h2><Skills skills={null} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Frameworks</h2><Skills skills={null} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Databases</h2><Skills skills={null} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Cloud</h2><Skills skills={null} /></div>
            <div><h2 className="text-sm font-semibold mb-1">DevOps</h2><Skills skills={null} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Cyber Security</h2><Skills skills={null} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Data Science</h2><Skills skills={null} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Role</h2><Skills skills={null} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Seniority</h2><Skills skills={null} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Soft Skills</h2><Skills skills={null} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Companies</h2><Skills skills={null} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Location</h2><Skills skills={null} /></div>
            <div><h2 className="text-sm font-semibold mb-1">Work Mode</h2><Skills skills={null} /></div>
          </div>
        </div>
        <div className="mt-10 space-y-4">
          {/* Openings placeholder skeleton */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-gray-700 rounded-md p-4 bg-zinc-900/40">
              <div className="h-4 w-3/4 bg-gray-700/40 rounded mb-2 animate-pulse" />
              <div className="flex gap-2 mb-3">
                <span className="h-3 w-20 bg-gray-700/40 rounded animate-pulse" />
                <span className="h-3 w-4 bg-gray-800/40 rounded" />
                <span className="h-3 w-16 bg-gray-700/40 rounded animate-pulse" />
                <span className="h-3 w-4 bg-gray-800/40 rounded" />
                <span className="h-3 w-16 bg-gray-700/40 rounded animate-pulse" />
                <span className="h-3 w-4 bg-gray-800/40 rounded" />
                <span className="h-3 w-14 bg-gray-700/40 rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-gray-700/40 rounded animate-pulse" />
                <div className="h-3 w-11/12 bg-gray-700/40 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-gray-700/40 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        <hr className={"my-8 border-gray-700"} />
        <footer className={"flex flex-col sm:flex-row justify-between items-center"}>
          <div className={"text-gray-500 max-w-xl text-xs md:text-sm animate-pulse"}>
            <div className="h-4 w-40 bg-gray-700/40 rounded mb-2" />
            <div className="h-3 w-72 bg-gray-700/40 rounded mb-1" />
            <div className="h-3 w-64 bg-gray-700/40 rounded mb-1" />
            <div className="h-3 w-56 bg-gray-700/40 rounded" />
          </div>
          <div className={"text-gray-500 max-w-lg text-xs md:text-sm animate-pulse mt-6 sm:mt-0"}>
            <div className="h-4 w-32 bg-gray-700/40 rounded mb-2" />
            <div className="h-3 w-60 bg-gray-700/40 rounded mb-1" />
            <div className="h-3 w-48 bg-gray-700/40 rounded" />
          </div>
        </footer>
      </div>
    );

  if (!data)
    return (
      <p>
        No data found. Please check the <Link href="/api/v1">API</Link> or try again later.
      </p>
    );

  const activeTodayOn = !!(queryParams.activeToday && queryParams.activeToday.includes('1'));

  return (
    <div className={"max-w-7xl mx-auto px-1 md:px-6 lg:px-8"}>
      <div>
        <div className={"flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between pt-4"}>
          <h1 className="text-2xl md:text-3xl font-semibold">Job Listings ({filteredData.length})</h1>
          <h3 className={"text-[11px] xs:text-xs sm:text-sm md:text-base lg:text-lg line-clamp-4 text-gray-400"}>
            Source duunitori.fi/api/v1/jobentries?search=Tieto- ja tietoliikennetekniikka (ala)
          </h3>
          <div className="flex items-center gap-4">
            <label
              htmlFor="active-today-toggle"
              className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-300"
            >
              <div className="relative">
                <input
                  id="active-today-toggle"
                  type="checkbox"
                  className="sr-only peer"
                  checked={activeTodayOn}
                  onChange={() => updateFilter('activeToday', '1')}
                />
                <div className="w-10 h-5 bg-gray-600 peer-focus:ring-2 peer-focus:ring-green-400 rounded-full peer peer-checked:bg-green-500 transition-all duration-300"></div>
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 peer-checked:translate-x-5"></div>
              </div>
              Active today only
            </label>
            <h3 className="text-sm text-gray-300" suppressHydrationWarning>Date {today}</h3>
          </div>
        </div>
        <div className={"mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6"}>
          <div>
            <h2 className="text-sm font-semibold mb-1">Languages</h2>
            <Skills skills={filteredCategories.languages} category={"languages"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-1">Frameworks</h2>
            <Skills skills={filteredCategories.frameworks} category={"frameworks"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-1">Databases</h2>
            <Skills skills={filteredCategories.databases} category={"databases"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-1">Cloud</h2>
            <Skills skills={filteredCategories.cloud} category={"cloud"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-1">DevOps</h2>
            <Skills skills={filteredCategories.devops} category={"devops"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-1">Cyber Security</h2>
            <Skills skills={filteredCategories.cyberSecurity} category={"cyberSecurity"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-1">Data Science</h2>
            <Skills skills={filteredCategories.dataScience} category={"dataScience"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-1">Role</h2>
            <Skills skills={filteredCategories.positions} category={"positions"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-1">Seniority</h2>
            <Skills skills={filteredCategories.seniority} category={"seniority"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-1">Soft Skills</h2>
            <Skills skills={filteredCategories.softSkills} category={"softSkills"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-1">Companies</h2>
            <Skills skills={filteredCompanies} category={"companies"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-1">Location</h2>
            <Skills skills={filteredCategories.cities || null} category={"cities"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-1">Work Mode</h2>
            <Skills skills={filteredCategories.workMode || null} category={"workMode"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-1">Salary</h2>
            <Skills skills={filteredCategories.salary || null} category={"salary"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>
        </div>
      </div>
      <div className="mt-6">
        <ActiveOpeningsAreaChart openings={filteredData as Results[]} />
      </div>
      <div className="mt-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowMoreGraphs((v) => !v)}
          className={
            "px-3 py-1.5 text-sm rounded-md border transition-colors " +
            (showMoreGraphs ? "border-green-500 bg-green-500/15 text-green-300 hover:bg-green-500/25" : "border-gray-600 text-gray-200 hover:bg-gray-800/60")
          }
          aria-expanded={showMoreGraphs}
        >
          {showMoreGraphs ? "Hide more graphs" : "Show more graphs"}
        </button>
      </div>
      {showMoreGraphs && (
        <div className="mt-4">
          <ExtraCharts openings={filteredData as Results[]} />
        </div>
      )}
      <Openings openings={filteredData} activeQuery={queryParams} />
      <hr className={"my-8 border-gray-400"} />
      <footer className={"flex flex-col sm:flex-row justify-between items-center"}>
        <div className={"text-gray-400 max-w-xl"}>
          <h3>How does this work?</h3>
          <p className={"py-2"}>
            The next.js app fetches data from {" "}
            <a href={"https://duunitori.fi/api/v1/jobentries?ohjelmointi+ja+ohjelmistokehitys+(ala)"}>duunitori.fi</a>{" "}
            public API and tries to match selected keywords from the job listing descriptions. Matching is done with
            regex. Source code available at {" "}
            <a href={"https://github.com/Jeb4dev/tech-trends"}>github.com/Jeb4dev/tech-trends</a>
          </p>
        </div>
        <div className={"text-gray-400 max-w-lg"}>
          <h3 className={"py-2"}>Disclamer</h3>
          <p>The data is not 100% accurate. The app is not affiliated with duunitori.fi.</p>
        </div>
      </footer>
    </div>
  );
}

export default function TrendsPage() {
  return (
    <Suspense fallback={<div className="px-8 sm:px-0">Loading...</div>}>
      <TrendsPageInner />
    </Suspense>
  );
}
