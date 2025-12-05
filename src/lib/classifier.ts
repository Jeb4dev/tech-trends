import * as Keywords from "@/keywords";
import { extractSalaryRaw } from "@/salary";

// Helper to escape regex characters (same as compute.ts)
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Category-specific matching strategies
type MatchStrategy = "complicated" | "simple" | "word-boundary";

const CATEGORY_STRATEGIES: Record<string, MatchStrategy> = {
  languages: "complicated",
  frameworks: "complicated",
  databases: "complicated",
  cloud: "complicated",
  devops: "complicated",
  dataScience: "complicated",
  cyberSecurity: "complicated",
  softSkills: "simple",
  positions: "simple",
  location: "word-boundary",
  seniority: "word-boundary", // Handled separately with scoring
};

// Build regex based on strategy (matching compute.ts patterns)
function buildRegex(pattern: string, strategy: MatchStrategy): RegExp {
  switch (strategy) {
    case "complicated":
      // Same as compute.ts for tech keywords: handles edge cases like C#, .NET
      return new RegExp(`(?:\\s|^|\\()(${pattern})(?=[\\s\\-.,:;!?/)]|\\/|$)`, "i");
    case "simple":
      // Word boundary for soft skills and positions
      return new RegExp(`\\b(?:${pattern})`, "i");
    case "word-boundary":
      // Strict word boundary matching
      return new RegExp(`\\b(${pattern})\\b`, "i");
    default:
      return new RegExp(`\\b(?:${pattern})`, "i");
  }
}

// Pre-compile matchers from keywords.ts for performance
const tagMatchers = Object.entries(Keywords).flatMap(([category, items]) => {
  if (!Array.isArray(items)) return [];
  // Skip seniority - we handle it with special scoring logic
  if (category === "seniority") return [];

  const strategy = CATEGORY_STRATEGIES[category] || "simple";

  return items.map((item: string | string[]) => {
    const variants = Array.isArray(item) ? item : [item];
    const label = variants[0];
    const positives = variants.filter((v) => !v.startsWith("!"));
    const negatives = variants.filter((v) => v.startsWith("!")).map((v) => v.slice(1).toLowerCase());

    const pattern = positives.map(escapeRegExp).join("|");
    const regex = buildRegex(pattern, strategy);

    return { category, label, regex, negatives, positives };
  });
});

// ============================================================================
// SENIORITY CLASSIFICATION (Ported from compute.ts with scoring system)
// ============================================================================
interface SeniorityGroup {
  label: string;
  synonyms: string[];
  negatives: string[];
}

const seniorityGroups: SeniorityGroup[] = Keywords.seniority.map((g: string | string[]) => {
  const arr = Array.isArray(g) ? g : [g];
  const [label, ...syns] = arr;
  return {
    label,
    synonyms: [label, ...syns].filter((s) => !s.startsWith("!")).map((s) => s.toLowerCase()),
    negatives: [label, ...syns].filter((s) => s.startsWith("!")).map((s) => s.slice(1).toLowerCase()),
  };
});

const SENIORITY_ORDER = ["Intern", "Junior", "Mid-level", "Senior", "Lead", "Director", "Vice President", "Chief"];
const HIGH_LEVEL_TITLES = new Set(["Lead", "Director", "Vice President", "Chief"]);
const AMBIGUOUS_HIGH = new Set(["lead", "head", "principal", "staff", "architect"]);

// Regex patterns for seniority context detection
const ROLE_AFTER_AMBIGUOUS = /(lead|head|principal|staff|architect)\s+(engineer|developer|designer|artist|programmer|researcher|analyst|manager|product|security|game|data|ui|ux)/i;
const TEAM_LEAD_PATTERN = /(team|technical|tech)\s+lead/i;
const MENTORING_JUNIOR_REGEX = /(mentor(ing)?|coach(ing)?|guide(ing)?|support(ing)?|train(ing)?)\s+(our\s+)?junior(s)?/i;
const CONTEXTUAL_HIGH_LEVEL = /(report(s|ing)?\s+to|support(ing)?|assist(ing)?|work(ing)?\s+with|collaborat(e|ing)\s+with)/i;
const CONTACT_SECTION_REGEX = /(lisätietoja|yhteyshenkilö|contact|ota\s+yhteyttä|rekrytoija|rekrytointipäällikkö)/i;
const YEARS_EXPERIENCE_REGEX = /\b(\d{1,2})\+?\s*(?:years|yrs|vuotta|v)\b/i;
const CHIEF_REGEX = /(toimitusjohtaja|verkställande\s+direktör|chief|c-level|cio|ciso|teknologiajohtaja|tiedonhallintajohtaja|tietoturvajohtaja)/gi;

function classifySeniority(title: string, desc: string): string {
  const titleLower = title.toLowerCase();
  const descLower = desc.toLowerCase();
  const full = titleLower + "\n" + descLower;

  const scores: Record<string, number> = {};
  const meta: Record<string, { titleHits: number; descHits: number; descStrong: number }> = {};

  // Score each seniority level
  for (const group of seniorityGroups) {
    if (group.negatives.some((n) => full.includes(n))) continue;

    let titleHits = 0;
    let descHits = 0;
    let strongDesc = 0;
    let subtotal = 0;

    for (const syn of group.synonyms) {
      const safe = syn.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const rWord = new RegExp(`\\b${safe}\\b`, "gi");

      const titleMatches = titleLower.match(rWord);
      if (titleMatches) {
        titleHits += titleMatches.length;
        subtotal += 10 * titleMatches.length; // Title matches are worth more
      }

      const descMatches = descLower.match(rWord);
      if (descMatches) {
        // Handle ambiguous high-level terms carefully
        if (AMBIGUOUS_HIGH.has(syn) && !titleMatches) {
          // Only count if followed by a role title
          if (!ROLE_AFTER_AMBIGUOUS.test(descLower) && !TEAM_LEAD_PATTERN.test(descLower)) {
            continue;
          }
          strongDesc += descMatches.length;
        }
        descHits += descMatches.length;
        subtotal += 2 * descMatches.length;
      }
    }

    if (subtotal > 0) {
      scores[group.label] = (scores[group.label] || 0) + subtotal;
      meta[group.label] = { titleHits, descHits, descStrong: strongDesc };
    }
  }

  // Years of experience heuristic
  const yearsMatch = descLower.match(YEARS_EXPERIENCE_REGEX);
  const years = yearsMatch ? parseInt(yearsMatch[1], 10) : null;
  if (years !== null) {
    if (years >= 10) scores["Senior"] = (scores["Senior"] || 0) + 4;
    else if (years >= 6) scores["Senior"] = (scores["Senior"] || 0) + 2;
    else if (years <= 2) scores["Junior"] = (scores["Junior"] || 0) + 2;
  }

  // Default to Mid-level if no explicit seniority in title
  if (!Object.values(meta).some((m) => m.titleHits > 0)) {
    scores["Mid-level"] = (scores["Mid-level"] || 0) + 2;
  }

  // Penalize Junior if the job mentions mentoring juniors (they want seniors)
  if (MENTORING_JUNIOR_REGEX.test(full) && scores["Junior"]) {
    scores["Junior"] -= 6;
  }

  // Filter out high-level titles that appear in "reports to" context
  for (const hl of HIGH_LEVEL_TITLES) {
    if (scores[hl] && (!meta[hl] || meta[hl].titleHits === 0)) {
      const idx = descLower.indexOf(hl.toLowerCase());
      if (idx > -1) {
        const window = descLower.slice(Math.max(0, idx - 50), idx + 50);
        if (CONTEXTUAL_HIGH_LEVEL.test(window)) {
          delete scores[hl];
        }
      }
    }
  }

  // Special handling for Chief - often appears in contact info
  if (scores["Chief"]) {
    const chiefMeta = meta["Chief"];
    if (!chiefMeta || chiefMeta.titleHits === 0) {
      const matches: number[] = [];
      let m: RegExpExecArray | null;
      const chiefRegexLocal = new RegExp(CHIEF_REGEX.source, "gi");
      while ((m = chiefRegexLocal.exec(descLower)) !== null) {
        matches.push(m.index);
        if (m.index === chiefRegexLocal.lastIndex) chiefRegexLocal.lastIndex++;
      }

      const contactStart = descLower.search(CONTACT_SECTION_REGEX);
      const allInContact = contactStart >= 0 && matches.length > 0 && matches.every((i) => i >= contactStart);

      let contextualCount = 0;
      for (const idx of matches) {
        const w = descLower.slice(Math.max(0, idx - 60), idx + 60);
        if (CONTEXTUAL_HIGH_LEVEL.test(w)) contextualCount++;
      }

      if (allInContact || contextualCount === matches.length) {
        delete scores["Chief"];
      } else if (matches.length === 1 && !years) {
        if ((scores["Chief"] || 0) <= 2) delete scores["Chief"];
        else scores["Chief"] = (scores["Chief"] || 0) - 3;
      }
    }
  }

  // Downgrade Senior if only in description without strong signals
  if (scores["Senior"] && meta["Senior"] && meta["Senior"].titleHits === 0 && meta["Senior"].descStrong === 0) {
    if (!years || years < 6) {
      scores["Mid-level"] = (scores["Mid-level"] || 0) + 1;
      delete scores["Senior"];
    }
  }

  // Downgrade Lead if only weak signals
  if (scores["Lead"] && meta["Lead"] && meta["Lead"].titleHits === 0 && meta["Lead"].descStrong === 0) {
    if (scores["Senior"]) {
      delete scores["Lead"];
    } else {
      scores["Mid-level"] = (scores["Mid-level"] || 0) + 1;
      delete scores["Lead"];
    }
  }

  // Default to Mid-level if nothing else matches
  if (!Object.entries(scores).some(([, v]) => v > 0)) {
    scores["Mid-level"] = 1;
  }

  // Pick the best match
  const best = Object.entries(scores)
    .filter(([, v]) => v > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return SENIORITY_ORDER.indexOf(b[0]) - SENIORITY_ORDER.indexOf(a[0]);
    })[0];

  return best ? best[0] : "Mid-level";
}

// ============================================================================
// WORK MODE CLASSIFICATION (Ported from workMode.ts with heuristics)
// ============================================================================
const REMOTE_STRONG = [
  /fully\s+remote/i,
  /100%\s*remote/i,
  /remote[- ]first/i,
  /location\s+independent/i,
  /work\s+from\s+anywhere/i,
  /distributed\s+team/i,
  /etätyö(?!n)/i,
  /\betänä\b/i,
  /pysyvästi\s+etänä/i,
  /li-remote/i,
];

const REMOTE_INDICATORS = [
  /\bremote\b/i,
  /work\s+from\s+home/i,
  /\bwfh\b/i,
  /etätyö/i,
  /etämahdollisuus/i,
  /mahdollisuus\s+etätyöhön/i,
  /osittain\s+etänä/i,
];

const HYBRID_INDICATORS = [
  /\bhybrid\b/i,
  /\bhybridi\b/i,
  /hybridimalli/i,
  /hybrid[- ]model/i,
  /partly\s+remote/i,
  /combination\s+of\s+(remote|office)/i,
  /(\d|two|three|few)\s+days?\s+(per\s+week\s+)?(at|in)\s+the\s+office/i,
  /osittain\s+toimistolla/i,
  /muutama\s+p[äa]iv[äa]\s+toimistolla/i,
  /li-hybrid/i,
];

const ONSITE_STRONG = [
  /on[- ]site\s+only/i,
  /must\s+be\s+on[- ]site/i,
  /(work|työskentelet)\s+(vain|ensisijaisesti)\s+(toimistolla|paikan\s+päällä)/i,
  /ei\s+etätyömahdollisuutta/i,
];

const ONSITE_INDICATORS = [
  /\bon[- ]site\b/i,
  /office[- ]based/i,
  /paikan\s+päällä/i,
  /\blähityö\b/i,
  /\btoimistolla\b/i,
  /asiakkaan\s+tiloissa/i,
  /client\s+site/i,
  /li-onsite/i,
];

function classifyWorkModeHeuristic(title: string, desc: string): string {
  const text = (title + "\n" + desc).toLowerCase();

  const countMatches = (patterns: RegExp[]): number => {
    return patterns.reduce((acc, r) => {
      const m = text.match(r);
      return acc + (m ? m.length : 0);
    }, 0);
  };

  const rs = countMatches(REMOTE_STRONG);
  const r = countMatches(REMOTE_INDICATORS);
  const h = countMatches(HYBRID_INDICATORS);
  const os = countMatches(ONSITE_STRONG);
  const oi = countMatches(ONSITE_INDICATORS);

  // Decision logic (same as workMode.ts)
  if (rs > 0 && os === 0 && oi === 0 && h === 0) return "remote";
  if (h > 0 || ((r > 0 || rs > 0) && (oi > 0 || os > 0))) return "hybrid";
  if (os > 0 || (oi > 0 && r === 0 && rs === 0)) return "onsite";
  if (r > 0 && oi === 0 && os === 0) return "remote";

  return "unknown"; // Let OpenAI handle ambiguous cases
}

// ============================================================================
// MAIN CLASSIFICATION INTERFACE
// ============================================================================
export interface JobClassification {
  tags: { category: string; name: string }[];
  salary?: { min: number; max: number; currency: string };
  workMode: string;
  seniority: string | null;
}

export async function classifyJob(title: string, desc: string, municipality?: string): Promise<JobClassification> {
  // IMPORTANT: Search both heading AND description for keywords
  // Job headings often contain critical info like "React Developer", "Python Engineer"
  // that may not be repeated in the description
  const heading = title || "";
  const description = desc || "";
  const fullText = `${heading}\n${description}\n${municipality || ""}`;
  const fullLower = fullText.toLowerCase();

  // Also prepare separate lowercased versions for specific checks
  const headingLower = heading.toLowerCase();
  const descLower = description.toLowerCase();

  // 1. Match Tags using improved regex patterns
  // Searches BOTH heading and description for all categories
  const tags: { category: string; name: string }[] = [];
  const seenLabels = new Set<string>(); // Dedupe within same category

  for (const m of tagMatchers) {
    // Skip if negative keyword found in either heading or description
    if (m.negatives.some((neg) => fullLower.includes(neg))) continue;

    // Test against full text (heading + description + municipality)
    if (m.regex.test(fullText)) {
      // Normalize category names (location -> locations)
      const category = m.category === "location" ? "locations" : m.category;
      const key = `${category}:${m.label}`;

      if (!seenLabels.has(key)) {
        seenLabels.add(key);
        tags.push({ category, name: m.label });
      }
    }
  }

  // 2. Special handling for locations - also check municipality field
  if (municipality) {
    const municipalityLower = municipality.toLowerCase();
    for (const loc of Keywords.location) {
      const variants = Array.isArray(loc) ? loc : [loc];
      const label = variants[0];
      const lowerVariants = variants.map((v) => v.toLowerCase());

      if (lowerVariants.includes(municipalityLower)) {
        const key = `locations:${label}`;
        if (!seenLabels.has(key)) {
          seenLabels.add(key);
          tags.push({ category: "locations", name: label });
        }
        break;
      }
    }
  }

  // 3. Extract Salary
  const salRaw = extractSalaryRaw(fullText);
  let salary;
  if (salRaw && salRaw.min) {
    salary = {
      min: salRaw.min,
      max: salRaw.max || salRaw.min,
      currency: "EUR",
    };
  }

  // 4. Work Mode - use comprehensive heuristic
  const workMode = classifyWorkModeHeuristic(title, desc);

  // 5. Seniority - use scoring-based classification
  const seniority = classifySeniority(title, desc);

  return {
    // Exclude seniority and workMode from tags since they're stored as columns
    tags: tags.filter((t) => !["seniority", "workMode"].includes(t.category)),
    salary,
    workMode,
    seniority,
  };
}
