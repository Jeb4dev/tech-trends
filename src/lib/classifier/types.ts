/**
 * Shared types for the classifier module
 */

export interface JobClassification {
  tags: { category: string; name: string }[];
  salary?: { min: number; max: number; currency: string };
  workMode: string;
  seniority: string | null;
}

export interface TagMatcher {
  category: string;
  label: string;
  regex: RegExp;
  negatives: string[];
  positives: string[];
}

export interface SeniorityGroup {
  label: string;
  synonyms: string[];
  negatives: string[];
}

export interface SeniorityMeta {
  titleHits: number;
  descHits: number;
  descStrong: number;
}

// Category-specific matching strategies
export type MatchStrategy = "complicated" | "simple" | "word-boundary";

