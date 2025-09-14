import { useState, useRef, useLayoutEffect, useMemo, useEffect } from "react";
import { QueryParams } from "@/types";
import { languages, frameworks, databases, cloud, devops, dataScience, cyberSecurity, softSkills, positions, seniority } from "@/keywords";
import { classifyWorkMode, workModeHighlightGroups } from "@/workMode";

// Use shared work mode highlight groups
const workMode = workModeHighlightGroups;

interface OpeningEntry {
  heading: string;
  date_posted: string;
  slug: string;
  municipality_name: string;
  export_image_url: string;
  company_name: string;
  descr: string;
  latitude: string | null;
  longitude: string | null;
}

interface TypeProps {
  openings: OpeningEntry[] | null;
  activeQuery?: QueryParams;
}

// ---------------- Keyword helpers ----------------
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildDictionary(): Record<string, string[]> {
  const dict: Record<string, string[]> = {};
  const groups = [languages, frameworks, databases, cloud, devops, dataScience, cyberSecurity, softSkills, positions, seniority, workMode];
  for (const group of groups) {
    for (const entry of group) {
      if (Array.isArray(entry)) {
        const [label, ...syns] = entry;
        dict[label.toLowerCase()] = [label, ...syns.filter(s => !s.startsWith("!"))];
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
  const buckets: (keyof QueryParams)[] = ["languages","frameworks","databases","cloud","devops","dataScience","cyberSecurity","softSkills","positions","seniority","workMode"];
  const terms: string[] = [];
  for (const bucket of buckets) {
    const labels = active[bucket] || [] as string[];
    for (const label of labels) {
      const syns = keywordDict[label.toLowerCase()];
      if (syns) terms.push(...syns);
    }
  }
  terms.push(...active.companies, ...active.locations);
  return Array.from(new Set(terms.filter(Boolean)));
}

function buildHighlightRegex(activeTerms: string[]) {
  if (!activeTerms.length) return null;
  const sorted = [...activeTerms].sort((a, b) => b.length - a.length);
  return new RegExp(`(${sorted.map(escapeRegExp).join("|")})`, "gi");
}

function highlightAndWrap(raw: string, highlightRegex: RegExp | null) {
  const text = raw.replace(/\r/g, "");
  const hl = (s: string) => highlightRegex ? s.replace(highlightRegex, m => `<mark class='bg-amber-300 text-black rounded px-0.5'>${m}</mark>`) : s;
  return text
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => `<p class='mb-3 leading-relaxed text-gray-300'>${hl(escapeHtml(l))}</p>`)
    .join("\n");
}

function makeSnippet(text: string) {
  return text.slice(0, 300).replace(/\s+/g, ' ').trim();
}

// ---------------- Component ----------------
export const Openings = ({ openings, activeQuery }: TypeProps) => {
  const [showCount, setShowCount] = useState(10);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const formatCache = useRef<Map<string, string>>(new Map());

  const activeTerms = useMemo(() => {
    const base = gatherActiveTerms(activeQuery);
    // Always include work mode indicator phrases for highlighting
    const wm = workMode.flatMap(g => Array.isArray(g) ? g : [g]);
    return Array.from(new Set([...base, ...wm]));
  }, [activeQuery]);
  const highlightRegex = useMemo(() => buildHighlightRegex(activeTerms), [activeTerms]);
  // Precompute work mode classification map (slug -> label)
  const workModeMap = useMemo(() => {
    if (!openings) return new Map<string, string>();
    const categories = classifyWorkMode(openings as any); // classifyWorkMode expects Results shape (compatible)
    const map = new Map<string, string>();
    categories.forEach(cat => cat.openings.forEach(o => map.set(o.slug, cat.label)));
    return map;
  }, [openings]);

  // Rebuild formatted cache for currently opened items when highlight terms change
  useEffect(() => {
    if (!openings || opened.size === 0) {
      formatCache.current.clear();
      return;
    }
    const newMap = new Map<string, string>();
    opened.forEach(slug => {
      const item = openings.find(o => o.slug === slug);
      if (item) newMap.set(slug, highlightAndWrap(item.descr, highlightRegex));
    });
    formatCache.current = newMap;
  }, [highlightRegex, openings, opened]);

  const handleShowMore = () => {
    if (!openings) return;
    if (showCount >= openings.length) return;
    setShowCount(prev => Math.min(openings.length, prev + 100));
  };

  const toggleOpen = (entry: OpeningEntry) => {
    setOpened(prev => {
      const next = new Set(prev);
      if (next.has(entry.slug)) next.delete(entry.slug); else {
        if (!formatCache.current.has(entry.slug)) {
          formatCache.current.set(entry.slug, highlightAndWrap(entry.descr, highlightRegex));
        }
        next.add(entry.slug);
      }
      return next;
    });
  };

  if (!openings) {
    return (
      <div className="py-8">
        <h1 className="pb-4">Filtered Job Listings</h1>
        {Array.from({ length: 5 }).map((_, i) => (
          <div className="flex flex-col" key={i}>
            <span className="loading-animation m-1 w-96 h-4 bg-blue-400 rounded" />
            <span className="loading-animation m-1 w-48 h-3 bg-zinc-200 rounded" />
            <span className="loading-animation m-1 w-32 h-2 bg-gray-400 rounded" />
            <span className="loading-animation m-1 w-full h-3 bg-gray-400 rounded" />
            <hr className="loading-animation my-4 border-gray-400" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="py-6 md:py-8">
      <h1 className="pb-3 md:pb-4 text-lg md:text-xl font-semibold">Filtered Job Listings ({openings.length})</h1>
      <ul className="space-y-4 md:space-y-6">
        {openings.slice(0, showCount).map(result => {
          const isOpen = opened.has(result.slug);
          let formatted = formatCache.current.get(result.slug) || "";
          if (isOpen && !formatted) {
            formatted = highlightAndWrap(result.descr, highlightRegex);
            formatCache.current.set(result.slug, formatted);
          }
          const snippet = makeSnippet(result.descr);
          return (
            <li key={result.slug}>
              <article className="border border-gray-700 rounded-md p-3 md:p-4 bg-zinc-900/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
                <header className="mb-2">
                  <a
                    href={`https://duunitori.fi/tyopaikat/tyo/${result.slug}`}
                    className="text-base md:text-lg font-semibold text-green-300 hover:text-green-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {result.heading}
                  </a>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] md:text-xs text-gray-400 mt-1 items-center">
                    <span>{result.company_name}</span>
                    <span className="opacity-50">•</span>
                    <span>{result.municipality_name}</span>
                    <span className="opacity-50">•</span>
                    <span>{new Date(result.date_posted).toLocaleDateString("fi-FI")}</span>
                    {workModeMap.get(result.slug) && (
                      <>
                        <span className="opacity-50">•</span>
                        <span className={"px-1 py-0.5 rounded text-[10px] uppercase tracking-wide " +
                          (workModeMap.get(result.slug)==="Remote" ? "text-emerald-300" : workModeMap.get(result.slug)==="Hybrid" ? "text-amber-300" : "text-blue-300")
                        }>
                          {workModeMap.get(result.slug)}
                        </span>
                      </>
                    )}
                   </div>
                </header>
                <div className="flex items-start gap-3 md:gap-4 mb-1.5 md:mb-2">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`desc-${result.slug}`}
                    aria-label={isOpen ? "Collapse description" : "Expand description"}
                    onClick={() => toggleOpen(result)}
                    className="text-[11px] md:text-xs inline-flex items-center gap-1 text-gray-500 hover:text-gray-200 transition-colors shrink-0 py-1 px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    {isOpen ? 'Show less' : 'Show more'}
                    <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" /></svg>
                  </button>
                  {!isOpen && (
                    <p
                      className="text-[12px] md:text-sm text-gray-400 leading-snug flex-1 overflow-hidden line-clamp-4 sm:line-clamp-1"
                      title={snippet}
                    >{snippet}</p>
                  )}
                </div>
                <CollapsibleSection id={`desc-${result.slug}`} open={isOpen} html={formatted} />
              </article>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 md:mt-6 flex justify-center">
        <button
          className="text-gray-300 text-xs md:text-sm text-center disabled:opacity-40 disabled:cursor-not-allowed border border-gray-600 hover:border-gray-400 rounded px-4 py-2 transition-colors"
          onClick={handleShowMore}
          disabled={showCount >= openings.length}
        >
          Load more <span className="text-gray-100 font-semibold ml-1">{Math.min(showCount, openings.length)}/{openings.length}</span>
        </button>
      </div>
    </div>
  );
};

// Animated collapsible component
const CollapsibleSection = ({ id, open, html }: { id: string; open: boolean; html: string }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);
  const [render, setRender] = useState(open);

  useLayoutEffect(() => {
    if (open) {
      setRender(true);
      requestAnimationFrame(() => {
        if (ref.current) setHeight(ref.current.scrollHeight);
      });
    } else if (ref.current) {
      setHeight(ref.current.scrollHeight);
      requestAnimationFrame(() => setHeight(0));
      const t = setTimeout(() => setRender(false), 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <div
      id={id}
      style={{ maxHeight: open ? height : height, transition: 'max-height 320ms ease', overflow: 'hidden' }}
      className="will-change-[max-height]"
    >
      {render && (
        <div ref={ref} className="pt-3 animate-fade-in" dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
};
