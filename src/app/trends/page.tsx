"use client";

import Link from "next/link";
import { Skills } from "./skill";
import { Category, Data, QueryParams, ResponseData, Results } from "@/types";
import { useEffect, useState, Suspense, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  cloud,
  databases,
  dataScience,
  cyberSecurity,
  devops,
  frameworks,
  languages,
  positions,
  seniority,
  softSkills,
  location,
} from "@/keywords";
import { Openings } from "./openings";
import { Slider } from "./slider";
import { classifyWorkMode } from "@/workMode";
import { extractSalaryRaw } from "@/salary";

// --- Helper utilities (pure) --------------------------------------------------
const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function matchAll(
  results: Results[],
  keywords: (string | string[])[],
  complicated: boolean = false,
  slice: number = 50,
  title = false
): Category[] {
  return keywords
    .map((keyword) => {
      const list = Array.isArray(keyword) ? keyword : [keyword];
      const escapedKeywords = list.map(escapeRegExp);
      const regexString = escapedKeywords.join("|");
      const negative: string[] = list
        .filter((kw) => kw.startsWith("!"))
        .map((kw) => kw.replace("!", ""));

      const regex = complicated
        ? new RegExp(`(?:\\s|^|\\()(${regexString})(?=[\\s\\-.,:;!?/)]|\\/|$)`, "gi")
        : new RegExp(`\\b(?:${regexString})`, "gi");

      const matched = results.filter((opening) => {
        regex.lastIndex = 0;
        if (
          negative &&
          negative.some((neg) =>
            title
              ? opening.heading.toLowerCase().includes(neg.toLowerCase())
              : opening.descr.toLowerCase().includes(neg.toLowerCase())
          )
        )
          return false;
        return regex.test(title ? opening.heading : opening.descr);
      });

      return {
        label: list[0],
        active: false,
        openings: matched,
        filteredOpenings: [],
      } as Category;
    })
    .sort((a, b) => b.openings.length - a.openings.length)
    .filter((k) => k.openings.length > 0)
    .slice(0, slice);
}

function groupResultsByProperty(results: Results[], property: keyof Results): Category[] {
  const categories: Category[] = [];
  results.forEach((result) => {
    if (!result[property]) return;
    const existing = categories.find((c) => c.label === result[property]);
    if (existing) existing.openings.push(result);
    else
      categories.push({
        label: result[property]!,
        active: false,
        openings: [result],
        filteredOpenings: [],
      });
  });
  return categories.sort((a, b) => b.openings.length - a.openings.length).filter((c) => c.label);
}

// Seniority classification (pure, single label per opening)
function classifySeniority(openings: Results[]): Category[] {
  const order = ["Intern", "Junior", "Mid-level", "Senior", "Lead", "Director", "Vice President", "Chief"];
  const groups = seniority.map((g) => {
    const arr = Array.isArray(g) ? g : [g];
    const [label, ...syns] = arr;
    return {
      label,
      synonyms: [label, ...syns].filter((s) => !s.startsWith("!")).map((s) => s.toLowerCase()),
      negatives: [label, ...syns].filter((s) => s.startsWith("!")).map((s) => s.slice(1).toLowerCase()),
    };
  });

  const highLevel = new Set(["Lead", "Director", "Vice President", "Chief"]);
  const ambiguousHigh = new Set(["lead", "head", "principal", "staff", "architect"]);
  const roleAfterAmbiguous =
    /(lead|head|principal|staff|architect)\s+(engineer|developer|designer|artist|programmer|researcher|analyst|manager|product|security|game|data|ui|ux)/i;
  const teamLeadPattern = /(team|technical|tech)\s+lead/i;
  const mentoringJuniorRegex = /(mentor(ing)?|coach(ing)?|guide(ing)?|support(ing)?|train(ing)?)\s+(our\s+)?junior(s)?/i;
  const contextualHighLevelPhrase = /(report(s|ing)?\s+to|support(ing)?|assist(ing)?|work(ing)?\s+with|collaborat(e|ing)\s+with)/i;
  const contactSectionRegex = /(lisätietoja|yhteyshenkilö|contact|ota\s+yhteyttä|rekrytoija|rekrytointipäällikkö)/i;

  const resultsMap: Record<string, Category> = {};
  groups.forEach((g) => {
    resultsMap[g.label] = { label: g.label, active: false, openings: [], filteredOpenings: [] };
  });

  openings.forEach((opening) => {
    const title = opening.heading.toLowerCase();
    const desc = opening.descr.toLowerCase();
    const full = title + "\n" + desc;
    const scores: Record<string, number> = {};
    const meta: Record<string, { titleHits: number; descHits: number; descStrong: number }> = {};

    groups.forEach((g) => {
      if (g.negatives.some((n) => full.includes(n))) return;
      let titleHits = 0;
      let descHits = 0;
      let strongDesc = 0;
      let subtotal = 0;
      g.synonyms.forEach((rawSyn) => {
        const syn = rawSyn.toLowerCase();
        const safe = syn.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        const rWord = new RegExp(`\\b${safe}\\b`, "gi");
        const t = title.match(rWord);
        if (t) {
          titleHits += t.length;
          subtotal += 10 * t.length;
        }
        rWord.lastIndex = 0;
        const d = desc.match(rWord);
        if (d) {
          if (ambiguousHigh.has(syn) && !title.match(rWord)) {
            let valid = false;
            if (roleAfterAmbiguous.test(desc) || teamLeadPattern.test(desc)) valid = true;
            if (!valid) return;
            strongDesc += d.length;
          }
          descHits += d.length;
          subtotal += 2 * d.length;
        }
      });
      if (subtotal > 0) {
        scores[g.label] = (scores[g.label] || 0) + subtotal;
        meta[g.label] = { titleHits, descHits, descStrong: strongDesc };
      }
    });

    const yearsMatch = desc.match(/\b(\d{1,2})\+?\s*(?:years|yrs|vuotta|v)\b/);
    let years = yearsMatch ? parseInt(yearsMatch[1], 10) : null;
    if (years !== null) {
      if (years >= 10) scores["Senior"] = (scores["Senior"] || 0) + 4;
      else if (years >= 6) scores["Senior"] = (scores["Senior"] || 0) + 2;
      else if (years <= 2) scores["Junior"] = (scores["Junior"] || 0) + 2;
    }

    if (!Object.values(meta).some((m) => m.titleHits > 0)) scores["Mid-level"] = (scores["Mid-level"] || 0) + 2;

    if (mentoringJuniorRegex.test(full) && scores["Junior"]) scores["Junior"] -= 6;

    highLevel.forEach((hl) => {
      if (scores[hl] && (!meta[hl] || meta[hl].titleHits === 0)) {
        const idx = desc.indexOf(hl.toLowerCase());
        if (idx > -1) {
          const window = desc.slice(Math.max(0, idx - 50), idx + 50);
          if (contextualHighLevelPhrase.test(window)) delete scores[hl];
        }
      }
    });

    if (scores["Chief"]) {
      const chiefMeta = meta["Chief"];
      if (!chiefMeta || chiefMeta.titleHits === 0) {
        const chiefRegex =
          /(toimitusjohtaja|verkställande\s+direktör|chief|c-level|cio|ciso|teknologiajohtaja|tiedonhallintajohtaja|tietoturvajohtaja)/gi;
        const matches: number[] = [];
        let _m: RegExpExecArray | null;
        while ((_m = chiefRegex.exec(desc)) !== null) {
          matches.push(_m.index);
          if (_m.index === chiefRegex.lastIndex) chiefRegex.lastIndex++;
        }
        const contactStart = desc.search(contactSectionRegex);
        const contextualHighLevelPhrase2 = contextualHighLevelPhrase;
        let allInContact = contactStart >= 0 && matches.length > 0 && matches.every((i) => i >= contactStart);
        let contextualCount = 0;
        for (const idx of matches) {
          const w = desc.slice(Math.max(0, idx - 60), idx + 60);
            if (contextualHighLevelPhrase2.test(w)) contextualCount++;
        }
        if (allInContact || contextualCount === matches.length) {
          delete scores["Chief"];
        } else if (matches.length === 1 && !years) {
          if (scores["Chief"] <= 2) delete scores["Chief"]; else scores["Chief"] -= 3;
        }
      }
    }

    if (
      scores["Senior"] &&
      meta["Senior"] &&
      meta["Senior"].titleHits === 0 &&
      meta["Senior"].descStrong === 0 &&
      (!years || years < 6)
    ) {
      scores["Mid-level"] = (scores["Mid-level"] || 0) + 1;
      delete scores["Senior"];
    }

    if (scores["Lead"] && meta["Lead"] && meta["Lead"].titleHits === 0 && meta["Lead"].descStrong === 0) {
      if (scores["Senior"]) delete scores["Lead"]; else { scores["Mid-level"] = (scores["Mid-level"] || 0) + 1; delete scores["Lead"]; }
    }

    if (!Object.entries(scores).some(([, v]) => v > 0)) scores["Mid-level"] = 1;

    const best = Object.entries(scores)
      .filter(([, v]) => v > 0)
      .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : order.indexOf(b[0]) - order.indexOf(a[0])))[0];
    if (best) {
      if (!resultsMap[best[0]]) resultsMap[best[0]] = { label: best[0], active: false, openings: [], filteredOpenings: [] };
      resultsMap[best[0]].openings.push(opening);
    }
  });

  return Object.values(resultsMap)
    .filter((c) => c.openings.length)
    .sort((a, b) => b.openings.length - a.openings.length);
}

// -----------------------------------------------------------------------------

function TrendsPageInner() {
  const [data, setData] = useState<ResponseData>({ count: 0, next: null, previous: null, results: [] });
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
  });

  useEffect(() => {
    setLoading(true);
    fetch("/api/v1")
      .then((res) => res.json())
      .then((data: ResponseData) => {
        // @ts-ignore
        setData(data.data);
        setLoading(false);
      });
  }, []);

  // Build base categories only when data.results changes
  const baseCategories = useMemo(() => {
    const results = data.results;
    if (!results || results.length === 0) {
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
    const lowerCache = new Map<Results, string>();
    const getFull = (o: Results) => {
      if (!lowerCache.has(o)) lowerCache.set(o, (o.heading + "\n" + o.descr).toLowerCase());
      return lowerCache.get(o)!;
    };
    const cityCategories: Category[] = location.map(city => {
      const variants = Array.isArray(city) ? city : [city];
      const lowerVariants = variants.map(v => v.toLowerCase());
      const pattern = lowerVariants.map(escapeRegExp).join("|");
      const regex = new RegExp(`\\b(?:${pattern})\\b`, 'i');
      const openings = results.filter(o => {
        const full = getFull(o);
        if (regex.test(full)) return true;
        const loc = o.municipality_name ? o.municipality_name.toLowerCase() : '';
        return loc && lowerVariants.includes(loc); // also include if primary location matches
      });
      return { label: variants[0], active: false, openings, filteredOpenings: [] } as Category;
    }).filter(c => c.openings.length > 0).sort((a,b)=> b.openings.length - a.openings.length);

    const categories: Data = {
      languages: matchAll(results, languages, true),
      frameworks: matchAll(results, frameworks, true),
      databases: matchAll(results, databases, true),
      cloud: matchAll(results, cloud, true),
      devops: matchAll(results, devops, true),
      dataScience: matchAll(results, dataScience, true),
      softSkills: matchAll(results, softSkills, false),
      cyberSecurity: matchAll(results, cyberSecurity, true),
      positions: matchAll(results, positions, false),
      seniority: classifySeniority(results),
      workMode: classifyWorkMode(results),
      cities: cityCategories,
      salary: [],
    };

    // Build salary categories
    const salaryRanges = [
      { label: "0-2000", min: 0, max: 1999 },
      { label: "2000-3000", min: 2000, max: 2999 },
      { label: "3000-4000", min: 3000, max: 3999 },
      { label: "4000-5000", min: 4000, max: 4999 },
      { label: "5000-6000", min: 5000, max: 5999 },
      { label: "6000-7000", min: 6000, max: 6999 },
      { label: "7000-8000", min: 7000, max: 7999 },
      { label: "8000+", min: 8000, max: Infinity },
    ];
    const salaryIncluded: Results[] = [];
    const rangeBuckets: Record<string, Results[]> = Object.fromEntries(salaryRanges.map(r => [r.label, []]));

    results.forEach(o => {
      const sal = extractSalaryRaw(o.heading + "\n" + o.descr);
      if (!sal) return; // no mention
      salaryIncluded.push(o);
      if (sal.min != null) {
        const minVal = sal.min;
        const maxVal = sal.max ?? sal.min;
        salaryRanges.forEach(r => {
          // overlap condition
            if (maxVal >= r.min && minVal < r.max) {
              rangeBuckets[r.label].push(o);
            }
            // Special case for 8000+ (Infinity max) already covered by condition above
        });
      }
    });

    const salaryCategories: Category[] = [];
    if (salaryIncluded.length) {
      salaryCategories.push({ label: "Salary Included", active: false, openings: salaryIncluded, filteredOpenings: [] });
    }
    salaryRanges.forEach(r => {
      const arr = rangeBuckets[r.label];
      if (arr.length) salaryCategories.push({ label: r.label, active: false, openings: arr, filteredOpenings: [] });
    });
    categories.salary = salaryCategories;

    const locations = groupResultsByProperty(results, "municipality_name");
    const companies = groupResultsByProperty(results, "company_name");
    return { categories, companies, locations };
  }, [data.results]);

  // Filter categories + compute filtered openings on query changes
  const { filteredData, filteredCategories, filteredCompanies } = useMemo(() => {
    const { categories, companies, locations } = baseCategories;

    const clone = (c: Category) => ({ ...c, openings: c.openings, filteredOpenings: c.filteredOpenings, active: false });

    let openings: Results[] = [];

    function process(list: Category[] | undefined, selected: string[] | undefined) {
      if (!list) return [] as Category[];
      const selectedArr = selected || [];
      return list.map((item) => {
        const active = selectedArr.includes(item.label.toLowerCase());
        if (active) {
          if (openings.length === 0) openings = item.openings; else {
            const set = new Set(item.openings);
            openings = openings.filter((o) => set.has(o));
          }
        }
        return { ...clone(item), active };
      });
    }

    const lang = process(categories.languages, queryParams.languages);
    const fw = process(categories.frameworks, queryParams.frameworks);
    const dbs = process(categories.databases, queryParams.databases);
    const cld = process(categories.cloud, queryParams.cloud);
    const dv = process(categories.devops, queryParams.devops);
    const ds = process(categories.dataScience, queryParams.dataScience);
    const cs = process(categories.cyberSecurity, queryParams.cyberSecurity);
    const ss = process(categories.softSkills, queryParams.softSkills);
    const wm = process(categories.workMode, queryParams.workMode);
    const pos = process(categories.positions, queryParams.positions);
    const sen = process(categories.seniority, queryParams.seniority);
    const salaryCats = process(categories.salary, queryParams.salary);
    const cityCats = process(categories.cities, queryParams.cities);
    const comps = process(companies, queryParams.companies);
    const locs = process(locations, queryParams.locations);

    if (openings.length === 0) openings = data.results; // no active filters => show all

    const openingsSet = openings === data.results ? null : new Set(openings);

    function attachFiltered(list: Category[]) {
      return list.map((item) => ({
        ...item,
        filteredOpenings: openingsSet ? item.openings.filter((o) => openingsSet.has(o)) : item.openings,
      }));
    }

    const filteredCategories: Data = {
      languages: attachFiltered(lang),
      frameworks: attachFiltered(fw),
      databases: attachFiltered(dbs),
      cloud: attachFiltered(cld),
      devops: attachFiltered(dv),
      dataScience: attachFiltered(ds),
      softSkills: attachFiltered(ss),
      cyberSecurity: attachFiltered(cs),
      positions: attachFiltered(pos),
      seniority: attachFiltered(sen),
      workMode: attachFiltered(wm),
      cities: attachFiltered(cityCats),
      salary: attachFiltered(salaryCats),
    };

    const filteredCompanies = attachFiltered(comps);
    const filteredLocations = attachFiltered(locs);

    return { filteredData: openings, filteredCategories, filteredCompanies, filteredLocations: filteredLocations }; // keep structure (filteredLocations unused)
  }, [baseCategories, queryParams, data.results]);

  const updateFilter = useCallback((filter: string, value: string) => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    const isSingleValue = filter === "minDate" || filter === "maxDate";
    if (isSingleValue) {
      if (params.get(filter) === value) params.delete(filter); else params.set(filter, value);
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

  function filterByDate(min: Date, max: Date) {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const minStr = `${min.getFullYear()}-${pad(min.getMonth() + 1)}-${pad(min.getDate())}`;
    const maxStr = `${max.getFullYear()}-${pad(max.getMonth() + 1)}-${pad(max.getDate())}`;
    // Single history/state update
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    if (params.get("minDate") === minStr) params.delete("minDate"); else params.set("minDate", minStr);
    if (params.get("maxDate") === maxStr) params.delete("maxDate"); else params.set("maxDate", maxStr);
    setQueryParams((prev) => ({
      ...prev,
      minDate: params.getAll("minDate").map(v => v.toLowerCase()),
      maxDate: params.getAll("maxDate").map(v => v.toLowerCase()),
    }));
    url.search = params.toString();
    window.history.pushState({}, "", url.toString());
  }

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

          {/* Slider placeholder */}
          <div className="mt-3 mx-1 md:mx-2">
            <div className="h-9 md:h-11 w-full rounded bg-gradient-to-r from-gray-700/40 via-gray-600/40 to-gray-700/40 animate-pulse" />
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

  return (
    <div className={"max-w-7xl mx-auto px-1 md:px-6 lg:px-8"}>
      <div>
        <div className={"flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between pt-4"}>
          <h1 className="text-2xl md:text-3xl font-semibold">Job Listings ({filteredData.length})</h1>
          <h3 className={"text-[11px] xs:text-xs sm:text-sm md:text-base lg:text-lg line-clamp-4 text-gray-400"}>
            Source duunitori.fi/api/v1/jobentries?search=Tieto- ja tietoliikennetekniikka (ala)
          </h3>
          <h3 className="text-sm text-gray-300">Date {new Date().toLocaleDateString("fi-FI")}</h3>
        </div>
        <div className="mt-3 mx-1 md:mx-2">
          <Slider
            min={new Date("09/01/2025")}
            filteredData={filteredData}
            filterByDate={filterByDate}
            initialMinDate={queryParams.minDate[0] ? new Date(queryParams.minDate[0]) : null}
            initialMaxDate={queryParams.maxDate[0] ? new Date(queryParams.maxDate[0]) : null}
          />
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
