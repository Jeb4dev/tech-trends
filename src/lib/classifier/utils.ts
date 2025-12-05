/**
 * Shared utilities for the classifier module
 */

import type { MatchStrategy } from "./types";

/**
 * Escape special regex characters in a string
 */
export const escapeRegExp = (s: string): string => {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Build regex based on matching strategy
 * Different strategies for different keyword categories
 */
export function buildRegex(pattern: string, strategy: MatchStrategy): RegExp {
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

/**
 * Strategy mapping for each keyword category
 */
export const CATEGORY_STRATEGIES: Record<string, MatchStrategy> = {
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
  seniority: "word-boundary",
};

