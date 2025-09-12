import { useState } from "react";
import { QueryParams } from "@/types";
import { languages, frameworks, databases, cloud, devops, dataScience, softSkills, positions, seniority } from "@/keywords";

interface type {
  openings: {
    heading: string;
    date_posted: string;
    slug: string;
    municipality_name: string;
    export_image_url: string;
    company_name: string;
    descr: string;
    latitude: string | null;
    longitude: string | null;
  }[] | null;
  activeQuery?: QueryParams;
}

// Utility to escape regex special chars
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build map label(lower)->synonyms array (excluding negative ones starting with '!')
function buildDictionary(): Record<string, string[]> {
  const dict: Record<string, string[]> = {};
  const groups = [languages, frameworks, databases, cloud, devops, dataScience, softSkills, positions, seniority];
  for (const group of groups) {
    for (const entry of group) {
      if (Array.isArray(entry)) {
        const [label, ...syns] = entry;
        const positives = [label, ...syns.filter((s) => !s.startsWith("!"))];
        dict[label.toLowerCase()] = positives;
      } else {
        dict[entry.toLowerCase()] = [entry];
      }
    }
  }
  return dict;
}
const keywordDict = buildDictionary();

function gatherActiveTerms(active?: QueryParams): string[] {
  if (!active) return [];
  const buckets: (keyof QueryParams)[] = [
    "languages","frameworks","databases","cloud","devops","dataScience","softSkills","positions","seniority"
  ];
  const terms: string[] = [];
  for (const bucket of buckets) {
    for (const label of active[bucket]) {
      const syns = keywordDict[label.toLowerCase()];
      if (syns) terms.push(...syns);
    }
  }
  // Companies & locations are exact labels (already lowercased in queryParams except original case unknown in text). Add them too.
  terms.push(...active.companies);
  terms.push(...active.locations);
  // Deduplicate & filter empty
  return Array.from(new Set(terms.filter(Boolean)));
}

function highlightText(text: string, active?: QueryParams): string {
  if (!active) return escapeHtml(text);
  const terms = gatherActiveTerms(active);
  if (terms.length === 0) return escapeHtml(text);
  // Sort by length desc to prefer longer matches
  terms.sort((a,b)=> b.length - a.length);
  const pattern = terms.map(t => escapeRegExp(t)).join("|");
  const regex = new RegExp(`(${pattern})`, "gi");
  const escaped = escapeHtml(text);
  // Because we escaped, we need to run highlight on original text BEFORE escaping. Instead, rebuild using split approach.
  return text.split(regex).map(part => {
    if (regex.test(part)) {
      regex.lastIndex = 0; // reset for safety
      return `<mark class=\"bg-yellow-300 text-black rounded px-0.5\">${escapeHtml(part)}</mark>`;
    }
    return escapeHtml(part);
  }).join("");
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const Openings = ({ openings, activeQuery }: type) => {
  const [showCount, setShowCount] = useState(10);
  const [openDetails, setOpenDetails] = useState<Set<string>>(new Set());

  const handleShowMore = () => {
    if (showCount >= openings!.length) return;
    if (showCount + 100 >= openings!.length) return setShowCount(openings!.length);
    setShowCount(showCount + 100);
  };

  const highlightForJob = (text: string): string => {
    if (!activeQuery) return escapeHtml(text);
    const allTerms = gatherActiveTerms(activeQuery);
    if (allTerms.length === 0) return escapeHtml(text);
    // Filter to only those terms that appear in this text (case-insensitive)
    const present = allTerms.filter(t => new RegExp(escapeRegExp(t), 'i').test(text));
    if (present.length === 0) return escapeHtml(text);
    // Sort by length to avoid nesting shorter inside longer
    present.sort((a,b)=> b.length - a.length);
    const pattern = present.map(t => escapeRegExp(t)).join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');
    return text.split(regex).map(part => {
      if (regex.test(part)) { regex.lastIndex = 0; return `<mark class=\"bg-yellow-300 text-black rounded px-0.5\">${escapeHtml(part)}</mark>`;} return escapeHtml(part);
    }).join('');
  };

  if (!openings) {
    return (
      <>
        <div className={"py-8"}>
          <h1 className={"pb-4"}>Filtered Job Listings</h1>
          {Array.from({ length: 5 }).map((_, i) => (
            <div className={"flex flex-col"} key={i}>
              <span className={"loading-animation m-1 w-96 h-4 bg-blue-400 rounded"}></span>
              <span className={"loading-animation m-1 w-48 h-3 bg-zinc-200 rounded"}></span>
              <span className={"loading-animation m-1 w-32 h-2 bg-gray-400 rounded"}></span>
              <span className={"loading-animation m-1 w-full h-3 bg-gray-400 rounded"}></span>
              <hr className={"loading-animation my-4 border-gray-400"} />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className={"py-8"}>
        <h1 className={"pb-4"}>Filtered Job Listings ({openings.length})</h1>
        <ul>
          {openings!.slice(0, showCount).map((result) => (
            <li key={result.slug}>
              <a href={`https://duunitori.fi/tyopaikat/tyo/${result.slug}`} className={"text-xl font-bold"} target={"_blank"}>
                {result.heading}
              </a>
              <p className={"text-gray-200"}>
                {result.company_name} - {result.municipality_name}
              </p>
              <p className={"text-sm text-gray-400"}>
                {new Date(result.date_posted).toLocaleDateString("fi-FI")} - {" "}
                {new Date(result.date_posted).toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <details
                onToggle={(e) => {
                  const opened = (e.target as HTMLDetailsElement).open;
                  setOpenDetails(prev => {
                    const next = new Set(prev);
                    if (opened) next.add(result.slug); else next.delete(result.slug);
                    return next;
                  });
                }}
              >
                <summary className={"line-clamp-1 text-sm text-gray-400 tracking-wider"}>{result.descr}</summary>
                {openDetails.has(result.slug) ? (
                  <p
                    className={"text-sm text-gray-300 tracking-wider whitespace-pre-wrap"}
                    dangerouslySetInnerHTML={{ __html: highlightForJob(result.descr) }}
                  />
                ) : (
                  <p className={"text-sm text-gray-300 tracking-wider whitespace-pre-wrap"}>{result.descr}</p>
                )}
              </details>
              <hr className={"my-4 border-gray-400"} />
            </li>
          ))}
        </ul>
        <button
          className={"text-gray-400 text-sm text-center disabled:cursor-not-allowed"}
          onClick={handleShowMore}
          disabled={showCount >= openings.length}
        >
          Load more (
          <span className={"text-gray-200 font-bold"}>
            {showCount}/{openings.length}
          </span>
          )
        </button>
      </div>
    </>
  );
};
