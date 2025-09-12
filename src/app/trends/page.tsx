"use client";

import Link from "next/link";
import { Skills } from "./skill";
import { Category, Data, QueryParams, ResponseData, Results } from "@/types";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  cloud,
  databases,
  dataScience,
  devops,
  frameworks,
  languages,
  positions,
  seniority,
  softSkills,
} from "@/keywords";
import { Openings } from "@/app/trends/openings";
import { Slider } from "@/app/trends/slider";

export default function Data() {
  const [data, setData] = useState<ResponseData>({ count: 0, next: null, previous: null, results: [] });
  const [isLoading, setLoading] = useState(false);
  const [categoryData, setCategoryData] = useState<Data>({
    languages: [],
    frameworks: [],
    databases: [],
    cloud: [],
    devops: [],
    dataScience: [],
    softSkills: [],
    positions: [],
    seniority: [],
  });
  const params = useSearchParams();
  const [count, setCount] = useState(0);
  const [queryParams, setQueryParams] = useState<QueryParams>({
    languages: params.getAll("languages").map((q) => q.toLowerCase()),
    frameworks: params.getAll("frameworks").map((q) => q.toLowerCase()),
    databases: params.getAll("databases").map((q) => q.toLowerCase()),
    cloud: params.getAll("cloud").map((q) => q.toLowerCase()),
    devops: params.getAll("devops").map((q) => q.toLowerCase()),
    dataScience: params.getAll("dataScience").map((q) => q.toLowerCase()),
    softSkills: params.getAll("softSkills").map((q) => q.toLowerCase()),
    positions: params.getAll("positions").map((q) => q.toLowerCase()),
    seniority: params.getAll("seniority").map((q) => q.toLowerCase()),
    companies: params.getAll("companies").map((q) => q.toLowerCase()),
    locations: params.getAll("locations").map((q) => q.toLowerCase()),
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

  if (isLoading)
    return (
      <div className={"px-8 sm:px-0"}>
        <div>
          <div className={"flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"}>
            <h1>
              Job Listings (<span className={"loading-animation"}>{data.results.length}</span>)
            </h1>

            <h3 className={"text-sm sm:text-2xl line-clamp-4"}>
              Source duunitori.fi/api/v1/jobentries?search=Tieto- ja tietoliikennetekniikka (ala)
            </h3>
            <h3>Date {new Date().toLocaleDateString("fi-FI")}</h3>
          </div>

          <div className={"categories"}>
            <div>
              <h2>Languages</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>Frameworks</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>Databases</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>Cloud</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>DevOps</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>Soft Skills</h2>
              <Skills skills={null} />
            </div>

            <div className={"sm:max-w-[25%]"}>
              <h2>Top Companies</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>Primary Location</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>Role</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>Seniority</h2>
              <Skills skills={null} />
            </div>

            <div>
              <h2>Data Science</h2>
              <Skills skills={null} />
            </div>
          </div>
        </div>
        <Openings openings={null} />
        <hr className={"my-8 border-gray-400"} />
        <footer className={"flex flex-col sm:flex-row justify-between items-center"}>
          <div className={"text-gray-400 max-w-xl"}>
            <h3>How does this work?</h3>
            <p className={"py-2"}>
              The next.js app fetches data from{" "}
              <a href={"https://duunitori.fi/api/v1/jobentries?ohjelmointi+ja+ohjelmistokehitys+(ala)"}>duunitori.fi</a>{" "}
              public API and tries to match selected keywords from the job listing descriptions. Matching is done with
              regex. Source code available at{" "}
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

  if (!data)
    return (
      <p>
        No data found. Please check the <Link href="/api/v1">API</Link> or try again later.
      </p>
    );

  function matchAll(
    keywords: (string | string[])[],
    complicated: boolean = false,
    slice: number = 50,
    title = false
  ): Category[] {
    return keywords
      .map((keyword) => {
        let openings: Results[] = [];
        const keywords = Array.isArray(keyword) ? keyword : [keyword];
        const escapedKeywords = keywords.map(escapeRegExp);
        const regexString = escapedKeywords.join("|");
        let negative: string[] = keywords
          .filter((keyword) => keyword.startsWith("!"))
          .map((keyword) => {
            return keyword.replace("!", "");
          });

        const regex = complicated
          ? new RegExp(`(?:\\s|^|\\()(${regexString})(?=[\\s\\-.,:;!?/)]|\\/|$)`, "gi")
          : new RegExp(`\\b(?:${regexString})`, "gi");

        return {
          label: keywords[0],
          active: false,
          openings: openings.concat(
            data.results.filter((opening) => {
              regex.lastIndex = 0;
              if (
                negative &&
                negative.some((keyword) =>
                  title
                    ? opening.heading.toLowerCase().includes(keyword.toLowerCase())
                    : opening.descr.toLowerCase().includes(keyword.toLowerCase())
                )
              ) {
                return false;
              }
              return regex.test(title ? opening.heading : opening.descr);
            })
          ),
          filteredOpenings: [],
        };
      })
      .sort((a, b) => b.openings.length - a.openings.length)
      .filter((keyword) => keyword.openings.length > 0)
      .slice(0, slice);
  }

  function populateCategories() {
    categoryData.languages = matchAll(languages, true);
    categoryData.frameworks = matchAll(frameworks, true);
    categoryData.databases = matchAll(databases, true);
    categoryData.languages = matchAll(languages, true);
    categoryData.cloud = matchAll(cloud, true);
    categoryData.devops = matchAll(devops, true);
    categoryData.dataScience = matchAll(dataScience, true);
    categoryData.softSkills = matchAll(softSkills, false);
    categoryData.positions = matchAll(positions, false);
    categoryData.seniority = matchAll(seniority, true);
  }

  function filterByQueryParams() {
    let openings: Results[] = [];
    function getCommon(items: Category[], queryParams: string[]) {
      if (queryParams.length == 0) return;
      items.forEach((item) => {
        if (queryParams.includes(item.label.toLowerCase())) {
          item.active = true;
          openings.length == 0
            ? (openings = openings.concat(item.openings))
            : (openings = openings.filter((opening) => item.openings.includes(opening)));
        }
      });
    }

    function filterCommon(items: Category[]) {
      items.forEach((item) => {
        item.filteredOpenings =
          openings.length == 0 ? item.openings : openings.filter((opening) => item.openings.includes(opening));
      });
    }

    getCommon(categoryData.languages, queryParams.languages);
    getCommon(categoryData.frameworks, queryParams.frameworks);
    getCommon(categoryData.databases, queryParams.databases);
    getCommon(categoryData.cloud, queryParams.cloud);
    getCommon(categoryData.devops, queryParams.devops);
    getCommon(categoryData.dataScience, queryParams.dataScience);
    getCommon(categoryData.softSkills, queryParams.softSkills);
    getCommon(categoryData.positions, queryParams.positions);
    getCommon(categoryData.seniority, queryParams.seniority);
    getCommon(companies, queryParams.companies);
    getCommon(locations, queryParams.locations);

    filterCommon(categoryData.languages);
    filterCommon(categoryData.frameworks);
    filterCommon(categoryData.databases);
    filterCommon(categoryData.cloud);
    filterCommon(categoryData.devops);
    filterCommon(categoryData.dataScience);
    filterCommon(categoryData.softSkills);
    filterCommon(categoryData.positions);
    filterCommon(categoryData.seniority);
    filterCommon(companies);
    filterCommon(locations);

    if (openings.length == 0) openings = data.results;

    return openings;
  }

  function filterByDate(min: Date, max: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    updateFilter("minDate", `${min.getFullYear()}-${pad(min.getMonth() + 1)}-${pad(min.getDate())}`);
    updateFilter("maxDate", `${max.getFullYear()}-${pad(max.getMonth() + 1)}-${pad(max.getDate())}`);
  }

  function updateFilter(filter: string, value: string) {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);

    const isSingleValue = filter === 'minDate' || filter === 'maxDate';

    if (isSingleValue) {
      // For date filters, keep only one value or toggle off if identical
      if (params.get(filter) === value) {
        params.delete(filter);
      } else {
        params.set(filter, value);
      }
    } else {
      // Multi-select toggle behavior
      const existing = params.getAll(filter);
      if (existing.includes(value)) {
        // remove this value
        const remaining = existing.filter(v => v !== value);
        params.delete(filter);
        remaining.forEach(v => params.append(filter, v));
      } else {
        params.append(filter, value);
      }
    }

    setQueryParams({
      ...queryParams,
      [filter]: params.getAll(filter),
    });

    url.search = params.toString();
    window.history.pushState({}, "", url.toString());
  }

  const groupResultsByProperty = (results: Results[], property: keyof Results): Category[] => {
    const categories: Category[] = [];

    results.forEach((result) => {
      const category = categories.find((category) => category.label === result[property]);

      if (category) {
        category.openings.push(result);
      } else {
        categories.push({
          label: result[property]!,
          active: false,
          openings: [result],
          filteredOpenings: [],
        });
      }
    });

    return categories.sort((a, b) => b.openings.length - a.openings.length).filter((category) => category.label);
  };

  // Remove duplicate escapeRegExp earlier and keep a single correct implementation
  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // --- Seniority Scoring --------------------------------------------------------
  // Assign exactly one best-matching seniority per opening using a scoring model.
  // Higher weights for title matches vs description. Negative context reduces Junior noise.
  function classifySeniority(openings: Results[]): Category[] {
    const order = ["Intern","Junior","Mid-level","Senior","Lead","Director","Vice President","Chief"]; // simplified order for tie-breaking

    const groups = seniority.map(g => {
      const arr = Array.isArray(g) ? g : [g];
      const [label, ...syns] = arr;
      return { label, synonyms: [label, ...syns].filter(s=>!s.startsWith('!')).map(s=>s.toLowerCase()), negatives: [label, ...syns].filter(s=>s.startsWith('!')).map(s=>s.slice(1).toLowerCase()) };
    });

    const highLevel = new Set(["Lead","Director","Vice President","Chief"]);
    const ambiguousHigh = new Set(["lead","head","principal","staff","architect"]); // when in description only, require pattern
    const roleAfterAmbiguous = /(lead|head|principal|staff|architect)\s+(engineer|developer|designer|artist|programmer|researcher|analyst|manager|product|security|game|data|ui|ux)/i;
    const teamLeadPattern = /(team|technical|tech)\s+lead/i;

    const mentoringJuniorRegex = /(mentor(ing)?|coach(ing)?|guide(ing)?|support(ing)?|train(ing)?)\s+(our\s+)?junior(s)?/i;
    const contextualHighLevelPhrase = /(report(s|ing)?\s+to|support(ing)?|assist(ing)?|work(ing)?\s+with|collaborat(e|ing)\s+with)/i;
    const contactSectionRegex = /(lisätietoja|yhteyshenkilö|contact|ota\s+yhteyttä|rekrytoija|rekrytointipäällikkö)/i;

    const resultsMap: Record<string, Category> = {};
    groups.forEach(g=>{resultsMap[g.label]={label:g.label,active:false,openings:[],filteredOpenings:[]};});

    openings.forEach(opening => {
      const title = opening.heading.toLowerCase();
      const desc = opening.descr.toLowerCase();
      const full = title + '\n' + desc;

      const scores: Record<string, number> = {};
      const meta: Record<string,{titleHits:number;descHits:number;descStrong:number}> = {};

      groups.forEach(g => {
        if (g.negatives.some(n => full.includes(n))) return;
        let titleHits = 0; let descHits = 0; let strongDesc = 0; let subtotal = 0;
        g.synonyms.forEach(rawSyn => {
          const syn = rawSyn.toLowerCase();
          const safe = syn.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');
          const rWord = new RegExp(`\\b${safe}\\b`,'gi');
          const t = title.match(rWord);
          if (t) { titleHits += t.length; subtotal += 10 * t.length; }
          rWord.lastIndex = 0;
          const d = desc.match(rWord);
          if (d) {
            if (ambiguousHigh.has(syn) && !title.match(rWord)) {
              let valid = false;
              if (roleAfterAmbiguous.test(desc) || teamLeadPattern.test(desc)) valid = true;
              if (!valid) return; // skip ambiguous occurrence
              strongDesc += d.length;
            }
            descHits += d.length;
            subtotal += 2 * d.length;
          }
        });
        if (subtotal>0){
          scores[g.label]=(scores[g.label]||0)+subtotal;
          meta[g.label]={titleHits,descHits,descStrong:strongDesc};
        }
      });

      // Years of experience heuristic
      const yearsMatch = desc.match(/\b(\d{1,2})\+?\s*(?:years|yrs|vuotta|v)\b/);
      let years = yearsMatch?parseInt(yearsMatch[1],10):null;
      if (years!==null){
        if (years>=10) scores['Senior']=(scores['Senior']||0)+4; else if (years>=6) scores['Senior']=(scores['Senior']||0)+2; else if (years<=2) scores['Junior']=(scores['Junior']||0)+2;
      }

      if (!Object.values(meta).some(m=>m.titleHits>0)) scores['Mid-level']=(scores['Mid-level']||0)+2;

      if (mentoringJuniorRegex.test(full) && scores['Junior']) scores['Junior']-=6;

      // Remove contextual high-level
      for (const hl of highLevel){
        if (scores[hl] && (!meta[hl] || meta[hl].titleHits===0)){
          const idx = desc.indexOf(hl.toLowerCase());
          if (idx>-1){
            const window = desc.slice(Math.max(0,idx-50), idx+50);
            if (contextualHighLevelPhrase.test(window)) delete scores[hl];
          }
        }
      }

      // Chief-specific suppression: only keep Chief if title hit OR strong, non-contact description usage
      if (scores['Chief']) {
        const chiefMeta = meta['Chief'];
        if (!chiefMeta || chiefMeta.titleHits===0) {
          const chiefRegex = /(toimitusjohtaja|verkställande\s+direktör|chief|c-level|cio|ciso|teknologiajohtaja|tiedonhallintajohtaja|tietoturvajohtaja)/gi;
          const matches = [...desc.matchAll(chiefRegex)].map(m=>m.index||0);
          const contactStart = desc.search(contactSectionRegex);
          let allInContact = contactStart>=0 && matches.length>0 && matches.every(i=>i>=contactStart);
          let contextualCount = 0;
          for (const idx of matches){
            const w = desc.slice(Math.max(0,idx-60), idx+60);
            if (contextualHighLevelPhrase.test(w)) contextualCount++;
          }
          if (allInContact || contextualCount===matches.length){
            delete scores['Chief'];
          } else if (matches.length===1 && !years) {
            // Single weak occurrence without years reinforcement -> reduce weight to avoid beating Mid-level baseline
            if (scores['Chief']<=2) delete scores['Chief']; else scores['Chief']-=3;
          }
        }
      }

      if (scores['Senior'] && meta['Senior'] && meta['Senior'].titleHits===0 && meta['Senior'].descStrong===0 && (!years || years<6)){
        scores['Mid-level']=(scores['Mid-level']||0)+1; delete scores['Senior'];
      }

      if (scores['Lead'] && meta['Lead'] && meta['Lead'].titleHits===0 && meta['Lead'].descStrong===0){
        if (scores['Senior']) delete scores['Lead']; else { scores['Mid-level']=(scores['Mid-level']||0)+1; delete scores['Lead']; }
      }

      if (!Object.entries(scores).some(([,v])=>v>0)) scores['Mid-level']=1;

      const best = Object.entries(scores)
        .filter(([,v])=>v>0)
        .sort((a,b)=>{ if (b[1]!==a[1]) return b[1]-a[1]; return order.indexOf(b[0])-order.indexOf(a[0]); })[0];
      if (best){
        if (!resultsMap[best[0]]) resultsMap[best[0]]={label:best[0],active:false,openings:[],filteredOpenings:[]};
        resultsMap[best[0]].openings.push(opening);
      }
    });

    return Object.values(resultsMap).filter(c=>c.openings.length).sort((a,b)=>b.openings.length-a.openings.length);
  }
  // ----------------------------------------------------------------------------

  populateCategories();
  // Replace simple matching for seniority with scoring-based single classification
  categoryData.seniority = classifySeniority(data.results);
  const locations = groupResultsByProperty(data.results, "municipality_name");
  const companies = groupResultsByProperty(data.results, "company_name");

  let filteredData: Results[] = filterByQueryParams();

  return (
    <div className={"px-8 sm:px-0"}>
      <div>
        <div className={"flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"}>
          <h1>Job Listings ({filteredData.length})</h1>

          <h3 className={"text-sm sm:text-2xl line-clamp-4"}>
            Source duunitori.fi/api/v1/jobentries?search=Tieto- ja tietoliikennetekniikka (ala)
          </h3>
          <h3>Date {new Date().toLocaleDateString("fi-FI")}</h3>
        </div>

        <div>
        <Slider min={new Date("09/01/2025")} filteredData={filteredData} filterByDate={filterByDate}
          initialMinDate={queryParams.minDate[0] ? new Date(queryParams.minDate[0]) : null}
          initialMaxDate={queryParams.maxDate[0] ? new Date(queryParams.maxDate[0]) : null}
        />
        </div>

        <div className={"categories"}>
          <div>
            <h2>Languages</h2>
            <Skills
              skills={categoryData.languages}
              category={"languages"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>

          <div>
            <h2>Frameworks</h2>
            <Skills
              skills={categoryData.frameworks}
              category={"frameworks"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>

          <div>
            <h2>Databases</h2>
            <Skills
              skills={categoryData.databases}
              category={"databases"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>

          <div>
            <h2>Cloud</h2>
            <Skills
              skills={categoryData.cloud}
              category={"cloud"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>

          <div>
            <h2>DevOps</h2>
            <Skills
              skills={categoryData.devops}
              category={"devops"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>

          <div>
            <h2>Soft Skills</h2>
            <Skills
              skills={categoryData.softSkills}
              category={"softSkills"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>

          <div className={"sm:max-w-[25%]"}>
            <h2>Top Companies</h2>
            <Skills skills={companies} category={"companies"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>

          <div>
            <h2>Primary Location</h2>
            <Skills skills={locations} category={"locations"} setLoading={setLoading} updateFilter={updateFilter} />
          </div>

          <div>
            <h2>Role</h2>
            <Skills
              skills={categoryData.positions}
              category={"positions"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>

          <div>
            <h2>Seniority</h2>
            <Skills
              skills={categoryData.seniority}
              category={"seniority"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>

          <div>
            <h2>Data Science</h2>
            <Skills
              skills={categoryData.dataScience}
              category={"dataScience"}
              setLoading={setLoading}
              updateFilter={updateFilter}
            />
          </div>
        </div>
      </div>
      <Openings openings={filteredData} activeQuery={queryParams} />
      <hr className={"my-8 border-gray-400"} />
      <footer className={"flex flex-col sm:flex-row justify-between items-center"}>
        <div className={"text-gray-400 max-w-xl"}>
          <h3>How does this work?</h3>
          <p className={"py-2"}>
            The next.js app fetches data from{" "}
            <a href={"https://duunitori.fi/api/v1/jobentries?ohjelmointi+ja+ohjelmistokehitys+(ala)"}>duunitori.fi</a>{" "}
            public API and tries to match selected keywords from the job listing descriptions. Matching is done with
            regex. Source code available at{" "}
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
