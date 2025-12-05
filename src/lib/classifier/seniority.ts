/**
 * Seniority classification using point-based scoring system
 * Analyzes job title and description to determine seniority level
 */

import * as Keywords from "@/keywords";
import type { SeniorityGroup, SeniorityMeta } from "./types";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SENIORITY_ORDER = ["Intern", "Junior", "Mid-level", "Senior", "Lead", "Director", "Vice President", "Chief"];
const HIGH_LEVEL_TITLES = new Set(["Lead", "Director", "Vice President", "Chief"]);

// Ambiguous terms that need context validation before counting toward Lead/Director
const AMBIGUOUS_HIGH = new Set([
  "lead", "head", "principal", "staff", "architect",
  "johtaja", "johtava", "päällikkö", "arkkitehti", "vetäjä"
]);

// ============================================================================
// REGEX PATTERNS
// ============================================================================

// Pattern to validate ambiguous terms are followed by a role (Lead Engineer, etc.)
const ROLE_AFTER_AMBIGUOUS = /(lead|head|principal|staff|architect|johtava|johtaja)\s+(engineer|developer|designer|artist|programmer|researcher|analyst|manager|product|security|game|data|ui|ux|kehittäjä|suunnittelija|ohjelmoija)/i;
const TEAM_LEAD_PATTERN = /(team|technical|tech|tiimin?)\s+(lead|vetäjä|johtaja)/i;

// Mentoring juniors suggests senior-level position
const MENTORING_JUNIOR_REGEX = /(mentor(ing)?|coach(ing)?|guide(ing)?|support(ing)?|train(ing)?|opasta|kouluta)\s+(our\s+|meidän\s+)?junior(s|eja|eita)?/i;

// High-level terms appearing in "reports to" context
const CONTEXTUAL_HIGH_LEVEL = /(report(s|ing)?\s+to|support(ing)?|assist(ing)?|work(ing)?\s+with|collaborat(e|ing)\s+with|raportoi(t|daan)?|työskentel(et|ee)\s+(yhdessä|kanssa))/i;

// Contact section indicators (to filter out CEO mentions in contact info)
const CONTACT_SECTION_REGEX = /(lisätietoja|yhteyshenkilö|contact|ota\s+yhteyttä|rekrytoija|rekrytointipäällikkö|haastattelija)/i;

// Years of experience extraction
const YEARS_EXPERIENCE_REGEX = /\b(\d{1,2})\+?\s*(?:years?|yrs?|vuotta|vuoden|v\.?|år)\b/i;

// Chief-level title detection
const CHIEF_REGEX = /(toimitusjohtaja|verkställande\s+direktör|chief|c-level|cio|ciso|cto|cfo|ceo|teknologiajohtaja|tiedonhallintajohtaja|tietoturvajohtaja)/gi;

// Experience level indicators
const EXTENSIVE_EXPERIENCE_REGEX = /(extensive|proven|solid|deep|broad|significant|considerable|vankka|laaja|merkittävä)\s+(track\s+record|experience|background|kokemus|tausta)/i;
const GROWTH_OPPORTUNITY_REGEX = /(grow(th)?|develop(ment)?|learn(ing)?|kasvu|kehit(tymis|ys)|oppimis)\s*(opportunity|potential|path|mahdollisuus|polku)?/i;
const STUDENT_PATTERN = /(student|opiskelija|studerande|graduate|vastavalmistunut|recent\s+graduate|opiskeli)/i;
const FIRST_JOB_PATTERN = /(first\s+job|ensimmäinen\s+työpaikka|career\s+start|aloittava|aloitteleva|uran\s+alku)/i;
const EXPERT_PATTERN = /\b(expert|asiantuntija|specialist|guru|evangelist|osaaja)\b/i;

// Compound title patterns for high-confidence matches
const COMPOUND_DIRECTOR_PATTERN = /(toimitusjohtaja|teknologiajohtaja|tietoturvajohtaja|myyntijohtaja|talousjohtaja|henkilöstöjohtaja|kehitysjohtaja|markkinointijohtaja|it[- ]johtaja|chief\s+\w+\s+officer)/i;
const COMPOUND_LEAD_PATTERN = /(tiimin?\s*vetäjä|team\s*lead|tech\s*lead|development\s*lead|project\s*lead|kehitystiimin?\s*vetäjä)/i;

// ============================================================================
// SENIORITY GROUPS (from keywords.ts)
// ============================================================================

const seniorityGroups: SeniorityGroup[] = Keywords.seniority.map((g: string | string[]) => {
  const arr = Array.isArray(g) ? g : [g];
  const [label, ...syns] = arr;
  return {
    label,
    synonyms: [label, ...syns].filter((s) => !s.startsWith("!")).map((s) => s.toLowerCase()),
    negatives: [label, ...syns].filter((s) => s.startsWith("!")).map((s) => s.slice(1).toLowerCase()),
  };
});

// ============================================================================
// CLASSIFICATION FUNCTION
// ============================================================================

/**
 * Classify seniority level based on job title and description
 * Uses a point-based scoring system with various heuristics
 *
 * @param title - Job title/heading
 * @param desc - Job description
 * @returns Seniority level string (e.g., "Senior", "Junior", "Mid-level")
 */
export function classifySeniority(title: string, desc: string): string {
  const titleLower = title.toLowerCase();
  const descLower = desc.toLowerCase();
  const full = titleLower + "\n" + descLower;

  const scores: Record<string, number> = {};
  const meta: Record<string, SeniorityMeta> = {};

  // ----------------------------------------
  // Step 1: Check compound titles (high confidence)
  // ----------------------------------------
  if (COMPOUND_DIRECTOR_PATTERN.test(titleLower)) {
    scores["Chief"] = (scores["Chief"] || 0) + 15;
    meta["Chief"] = { titleHits: 1, descHits: 0, descStrong: 0 };
  }
  if (COMPOUND_LEAD_PATTERN.test(titleLower)) {
    scores["Lead"] = (scores["Lead"] || 0) + 12;
    meta["Lead"] = { titleHits: 1, descHits: 0, descStrong: 0 };
  }

  // ----------------------------------------
  // Step 2: Score each seniority level by keyword matches
  // ----------------------------------------
  for (const group of seniorityGroups) {
    // Skip if negatives found (e.g., "!senior" for Junior)
    if (group.negatives.some((n) => full.includes(n))) continue;

    let titleHits = 0;
    let descHits = 0;
    let strongDesc = 0;
    let subtotal = 0;

    for (const syn of group.synonyms) {
      const safe = syn.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const rWord = new RegExp(`\\b${safe}\\b`, "gi");

      // Check title matches
      const titleMatches = titleLower.match(rWord);
      if (titleMatches) {
        // Validate ambiguous terms in title
        if (AMBIGUOUS_HIGH.has(syn)) {
          const isValidInTitle = ROLE_AFTER_AMBIGUOUS.test(titleLower) ||
                                  TEAM_LEAD_PATTERN.test(titleLower) ||
                                  COMPOUND_LEAD_PATTERN.test(titleLower) ||
                                  COMPOUND_DIRECTOR_PATTERN.test(titleLower);
          if (!isValidInTitle) continue;
        }
        titleHits += titleMatches.length;
        subtotal += 10 * titleMatches.length; // Title worth 10 points
      }

      // Check description matches
      const descMatches = descLower.match(rWord);
      if (descMatches) {
        // Validate ambiguous terms in description
        if (AMBIGUOUS_HIGH.has(syn) && !titleMatches) {
          const isValidContext = ROLE_AFTER_AMBIGUOUS.test(descLower) || TEAM_LEAD_PATTERN.test(descLower);
          if (!isValidContext) continue;
          strongDesc += descMatches.length;
        }
        descHits += descMatches.length;
        subtotal += 2 * descMatches.length; // Description worth 2 points
      }
    }

    if (subtotal > 0) {
      scores[group.label] = (scores[group.label] || 0) + subtotal;
      meta[group.label] = { titleHits, descHits, descStrong: strongDesc };
    }
  }

  // ----------------------------------------
  // Step 3: Years of experience heuristic
  // ----------------------------------------
  const yearsMatch = descLower.match(YEARS_EXPERIENCE_REGEX);
  const years = yearsMatch ? parseInt(yearsMatch[1], 10) : null;
  if (years !== null) {
    if (years >= 10) scores["Senior"] = (scores["Senior"] || 0) + 4;
    else if (years >= 6) scores["Senior"] = (scores["Senior"] || 0) + 2;
    else if (years >= 3 && years <= 5) scores["Mid-level"] = (scores["Mid-level"] || 0) + 2;
    else if (years <= 2) scores["Junior"] = (scores["Junior"] || 0) + 2;
  }

  // ----------------------------------------
  // Step 4: Experience phrase heuristics
  // ----------------------------------------
  if (EXTENSIVE_EXPERIENCE_REGEX.test(descLower)) {
    scores["Senior"] = (scores["Senior"] || 0) + 3;
  }
  if (EXPERT_PATTERN.test(full)) {
    scores["Senior"] = (scores["Senior"] || 0) + 2;
  }
  if (GROWTH_OPPORTUNITY_REGEX.test(descLower)) {
    scores["Junior"] = (scores["Junior"] || 0) + 1;
    scores["Mid-level"] = (scores["Mid-level"] || 0) + 1;
  }
  if (STUDENT_PATTERN.test(full)) {
    scores["Intern"] = (scores["Intern"] || 0) + 4;
    scores["Junior"] = (scores["Junior"] || 0) + 2;
  }
  if (FIRST_JOB_PATTERN.test(full)) {
    scores["Junior"] = (scores["Junior"] || 0) + 3;
    scores["Intern"] = (scores["Intern"] || 0) + 2;
  }

  // ----------------------------------------
  // Step 5: Default to Mid-level if no title match
  // ----------------------------------------
  if (!Object.values(meta).some((m) => m.titleHits > 0)) {
    scores["Mid-level"] = (scores["Mid-level"] || 0) + 2;
  }

  // ----------------------------------------
  // Step 6: Penalize Junior if mentoring juniors
  // ----------------------------------------
  if (MENTORING_JUNIOR_REGEX.test(full) && scores["Junior"]) {
    scores["Junior"] -= 6;
  }

  // ----------------------------------------
  // Step 7: Filter high-level titles in "reports to" context
  // ----------------------------------------
  for (const hl of HIGH_LEVEL_TITLES) {
    if (scores[hl] && (!meta[hl] || meta[hl].titleHits === 0)) {
      const hlLower = hl.toLowerCase();
      const idx = descLower.indexOf(hlLower);
      if (idx > -1) {
        const window = descLower.slice(Math.max(0, idx - 50), idx + 50);
        if (CONTEXTUAL_HIGH_LEVEL.test(window)) {
          delete scores[hl];
        }
      }
    }
  }

  // ----------------------------------------
  // Step 8: Special handling for Chief
  // ----------------------------------------
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

  // ----------------------------------------
  // Step 9: Downgrade weak signals
  // ----------------------------------------
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

  // ----------------------------------------
  // Step 10: Final fallback
  // ----------------------------------------
  if (!Object.entries(scores).some(([, v]) => v > 0)) {
    scores["Mid-level"] = 1;
  }

  // ----------------------------------------
  // Step 11: Pick best match
  // ----------------------------------------
  const best = Object.entries(scores)
    .filter(([, v]) => v > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return SENIORITY_ORDER.indexOf(b[0]) - SENIORITY_ORDER.indexOf(a[0]);
    })[0];

  return best ? best[0] : "Mid-level";
}

