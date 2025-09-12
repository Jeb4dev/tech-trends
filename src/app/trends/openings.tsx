import { useState, useRef, useLayoutEffect } from "react";
import { QueryParams } from "@/types";
import { languages, frameworks, databases, cloud, devops, dataScience, softSkills, positions, seniority } from "@/keywords";

interface TypeProps {
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

// --- Keyword Dictionary / Helpers --------------------------------------------------
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
  const groups = [languages, frameworks, databases, cloud, devops, dataScience, softSkills, positions, seniority];
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
  // include companies & locations (exact match attempts)
  terms.push(...active.companies, ...active.locations);
  return Array.from(new Set(terms.filter(Boolean)));
}

// --- Formatting & Highlighting -----------------------------------------------------
function formatDescription(raw: string, activeQuery?: QueryParams) {
  if (!raw) return "";
  const text = raw.replace(/\r/g, "");
  const lines = text.split(/\n/);
  const blocks: string[] = [];

  // ---- highlighting ----
  const activeTerms = gatherActiveTerms(activeQuery);
  activeTerms.sort((a, b) => b.length - a.length);
  const highlightRegex = activeTerms.length
    ? new RegExp(`(${activeTerms.map(escapeRegExp).join("|")})`, "gi")
    : null;
  const hl = (s: string) =>
    highlightRegex
      ? s.replace(
        highlightRegex,
        m => `<mark class='bg-amber-300 text-black rounded px-0.5'>${m}</mark>`
      )
      : s;

  // ---- helpers ----
  const MAX_SHORT = 160;

  const hasExplicitMarker = (t: string) =>
    /^[-*•·]\s+/.test(t) ||                // bullets
    /^\(?\d+[\.\)]\s+/.test(t) ||          // 1. 1) (1)
    /^[a-zA-Z][\.\)]\s+/.test(t) ||        // a) a.
    /^(?:–|—)\s+/.test(t);                 // en/em dash

  const stripMarker = (t: string) =>
    t
      .replace(/^[-*•·]\s+/, "")
      .replace(/^\(?\d+[\.\)]\s+/, "")
      .replace(/^[a-zA-Z][\.\)]\s+/, "")
      .replace(/^(?:–|—)\s+/, "");

  // Short, no end punctuation, heading-ish capitalization
  const isHeadingLike = (s: string, singleSegment: boolean) => {
    const t = s.trim();
    if (!t) return false;
    if (t.endsWith(":")) return true;
    if (/[.!?;]\s*$/.test(t)) return false;            // likely a sentence
    if (t.length > 55) return false;

    const words = t.split(/\s+/);
    const capStarts = words.filter(w => /^[A-ZÅÄÖ]/.test(w)).length;
    const ratio = capStarts / Math.max(1, words.length);

    // Title-ish OR stand-alone short line between blanks
    return ratio >= 0.5 || singleSegment;
  };

  // Inline “Heading␠␠Rest of line”
  const splitInlineHeading = (t: string): { head?: string; tail?: string } => {
    const parts = t.split(/\s{2,}/);
    if (parts.length > 1 && isHeadingLike(parts[0], false)) {
      return { head: parts[0].replace(/:$/, ""), tail: parts.slice(1).join(" ").trim() };
    }
    return {};
  };

  // Decide if consecutive lines (no blank lines) form a list
  function shouldAutoList(run: string[]): boolean {
    if (!run.length) return false;
    if (run.some(hasExplicitMarker)) return true;

    const cleaned = run.map(s => s.trim()).filter(Boolean);
    if (cleaned.length < 3) return false;

    const shortCount = cleaned.filter(s => s.length <= MAX_SHORT && !s.endsWith(":")).length;
    const startsCased = cleaned.filter(s => /^[A-ZÅÄÖ0-9]/.test(s)).length;
    const avgLen = cleaned.reduce((a, s) => a + s.length, 0) / cleaned.length;
    const actiony = cleaned.filter(s => /^(To\s+\p{L}+|\p{Lu}\p{Ll}{2,}\b(?:ing|ation|ment)|\p{Lu}\p{Ll}{2,}\s)/u.test(s)).length;

    if (shortCount / cleaned.length >= 0.7 && startsCased / cleaned.length >= 0.7 && avgLen < 140)
      return true;
    if (actiony / cleaned.length >= 0.5 && shortCount / cleaned.length >= 0.6)
      return true;
    return false;
  }

  // Partition into segments separated by at least one blank line
  const segments: string[][] = [];
  let seg: string[] = [];
  for (const ln of lines) {
    if (ln.trim() === "") {
      if (seg.length) segments.push(seg), (seg = []);
    } else seg.push(ln);
  }
  if (seg.length) segments.push(seg);

  for (const segment of segments) {
    if (!segment.length) continue;

    // Single-line segment -> heading candidate (e.g., “We are looking for”)
    if (segment.length === 1) {
      const s = segment[0].trim();
      if (!hasExplicitMarker(s) && isHeadingLike(s, true)) {
        blocks.push(
          `<h4 class='mt-4 mb-2 font-semibold text-green-400 tracking-wide'>${hl(escapeHtml(s))}</h4>`
        );
        continue;
      }
    }

    // Inline heading on first line
    const inline = splitInlineHeading(segment[0].trim());
    if (inline.head) {
      blocks.push(
        `<h4 class='mt-4 mb-2 font-semibold text-green-400 tracking-wide'>${hl(escapeHtml(inline.head))}</h4>`
      );
      const rest = [inline.tail!, ...segment.slice(1)].filter(Boolean);
      if (rest.length) {
        if (shouldAutoList(rest)) {
          blocks.push(
            `<ul class='list-disc marker:text-teal-400 list-outside pl-5 my-3 space-y-1'>` +
            rest.map(li => `<li class='mb-1'>${hl(escapeHtml(stripMarker(li.trim())))}</li>`).join("\n") +
            `</ul>`
          );
        } else {
          for (const line of rest) {
            blocks.push(`<p class='mb-3 leading-relaxed text-gray-300'>${hl(escapeHtml(line.trim()))}</p>`);
          }
        }
      }
      continue;
    }

    // Multi-line segment whose first line looks like a heading
    if (isHeadingLike(segment[0], false)) {
      const head = segment[0].trim().replace(/:$/, "");
      blocks.push(
        `<h4 class='mt-4 mb-2 font-semibold text-green-400 tracking-wide'>${hl(escapeHtml(head))}</h4>`
      );
      const rest = segment.slice(1);
      if (rest.length) {
        if (shouldAutoList(rest)) {
          blocks.push(
            `<ul class='list-disc marker:text-teal-400 list-outside pl-5 my-3 space-y-1'>` +
            rest.map(li => `<li class='mb-1'>${hl(escapeHtml(stripMarker(li.trim())))}</li>`).join("\n") +
            `</ul>`
          );
        } else {
          for (const line of rest) {
            blocks.push(`<p class='mb-3 leading-relaxed text-gray-300'>${hl(escapeHtml(line.trim()))}</p>`);
          }
        }
      }
      continue;
    }

    // No heading → list or paragraphs for the whole segment
    if (shouldAutoList(segment)) {
      blocks.push(
        `<ul class='list-disc marker:text-teal-400 list-outside pl-5 my-3 space-y-1'>` +
        segment.map(li => `<li class='mb-1'>${hl(escapeHtml(stripMarker(li.trim())))}</li>`).join("\n") +
        `</ul>`
      );
    } else {
      for (const line of segment) {
        blocks.push(`<p class='mb-3 leading-relaxed text-gray-300'>${hl(escapeHtml(line.trim()))}</p>`);
      }
    }
  }

  return blocks.join("\n");
}


function makeSnippet(text: string) {
  return text.slice(0, 300).replace(/\s+/g, ' ').trim();
}

// --- Component ---------------------------------------------------------------------
export const Openings = ({ openings, activeQuery }: TypeProps) => {
  const [showCount, setShowCount] = useState(10);
  const [opened, setOpened] = useState<Set<string>>(new Set());

  const handleShowMore = () => {
    if (!openings) return;
    if (showCount >= openings.length) return;
    const next = Math.min(openings.length, showCount + 100);
    setShowCount(next);
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
    <div className="py-8">
      <h1 className="pb-4">Filtered Job Listings ({openings.length})</h1>
      <ul>
        {openings.slice(0, showCount).map(result => {
          const isOpen = opened.has(result.slug);
          const formattedHtml = formatDescription(result.descr, activeQuery);
          const snippet = makeSnippet(result.descr);
          return (
            <li key={result.slug} className="mb-6">
              <article className="border border-gray-700 rounded-md p-4 bg-zinc-900/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
                <header className="mb-2">
                  <a
                    href={`https://duunitori.fi/tyopaikat/tyo/${result.slug}`}
                    className="text-lg font-semibold text-green-300 hover:text-green-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {result.heading}
                  </a>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 mt-1">
                    <span>{result.company_name}</span>
                    <span className="opacity-50">•</span>
                    <span>{result.municipality_name}</span>
                    <span className="opacity-50">•</span>
                    <span>{new Date(result.date_posted).toLocaleDateString("fi-FI")}</span>
                  </div>
                </header>
                <div className="flex items-start gap-4 mb-2">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`desc-${result.slug}`}
                    onClick={() => setOpened(prev => { const next = new Set(prev); isOpen ? next.delete(result.slug) : next.add(result.slug); return next; })}
                    className="text-xs inline-flex items-center gap-1 text-gray-500 hover:text-gray-200 transition-colors shrink-0 mt-0.5"
                  >
                    {isOpen ? 'Show less' : 'Show more'}
                    <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" /></svg>
                  </button>
                  {!isOpen && (
                    <p
                      className="text-sm text-gray-400 leading-snug flex-1 overflow-hidden line-clamp-4 sm:line-clamp-1"
                      title={snippet}
                    >{snippet}</p>
                  )}
                </div>
                <CollapsibleSection id={`desc-${result.slug}`} open={isOpen} html={formattedHtml} />
              </article>
            </li>
          );
        })}
      </ul>
      <button
        className="text-gray-400 text-sm text-center disabled:cursor-not-allowed"
        onClick={handleShowMore}
        disabled={showCount >= openings.length}
      >
        Load more (<span className="text-gray-200 font-bold">{showCount}/{openings.length}</span>)
      </button>
    </div>
  );
};

// Animated collapsible component
const CollapsibleSection = ({ id, open, html }: { id: string; open: boolean; html: string }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);
  const [render, setRender] = useState(open);

  // measure content
  useLayoutEffect(() => {
    if (open) {
      setRender(true);
      requestAnimationFrame(() => {
        if (ref.current) setHeight(ref.current.scrollHeight);
      });
    } else if (ref.current) {
      setHeight(ref.current.scrollHeight); // set to current height then collapse
      requestAnimationFrame(() => setHeight(0));
      // after transition ends, unmount content to reduce DOM weight
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
