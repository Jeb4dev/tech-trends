/**
 * Work mode classification (remote, hybrid, onsite)
 * Uses pattern matching to determine work arrangement
 */

// ============================================================================
// PATTERN DEFINITIONS
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

// ============================================================================
// CLASSIFICATION FUNCTION
// ============================================================================

/**
 * Classify work mode based on job title and description
 *
 * @param title - Job title/heading
 * @param desc - Job description
 * @returns Work mode: "remote", "hybrid", "onsite", or "unknown"
 */
export function classifyWorkMode(title: string, desc: string): string {
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

  // Decision logic:
  // 1. Strong remote indicators with no onsite/hybrid = remote
  // 2. Any hybrid indicator OR mix of remote and onsite = hybrid
  // 3. Strong onsite OR onsite without remote = onsite
  // 4. Weak remote without onsite = remote
  // 5. Otherwise unknown (let OpenAI handle)

  if (rs > 0 && os === 0 && oi === 0 && h === 0) return "remote";
  if (h > 0 || ((r > 0 || rs > 0) && (oi > 0 || os > 0))) return "hybrid";
  if (os > 0 || (oi > 0 && r === 0 && rs === 0)) return "onsite";
  if (r > 0 && oi === 0 && os === 0) return "remote";

  return "unknown";
}

