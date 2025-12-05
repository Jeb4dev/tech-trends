/**
 * Tag matching logic for job classification
 * Matches keywords from various categories (languages, frameworks, etc.)
 */

import * as Keywords from "@/keywords";
import type { TagMatcher } from "./types";
import { escapeRegExp, buildRegex, CATEGORY_STRATEGIES } from "./utils";

/**
 * Pre-compiled tag matchers for all keyword categories
 * Built once at module load for performance
 */
export const tagMatchers: TagMatcher[] = Object.entries(Keywords).flatMap(([category, items]) => {
  if (!Array.isArray(items)) return [];

  // Skip seniority - handled with special scoring logic in seniority.ts
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

/**
 * Match tags from job text
 * Searches both heading and description for all keyword categories
 */
export function matchTags(
  heading: string,
  description: string,
  municipality?: string
): { category: string; name: string }[] {
  const fullText = `${heading}\n${description}\n${municipality || ""}`;
  const fullLower = fullText.toLowerCase();

  const tags: { category: string; name: string }[] = [];
  const seenLabels = new Set<string>();

  // Match against all tag patterns
  for (const m of tagMatchers) {
    // Skip if negative keyword found
    if (m.negatives.some((neg) => fullLower.includes(neg))) continue;

    // Test against full text
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

  // Special handling for locations - also check municipality field
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

  return tags;
}

