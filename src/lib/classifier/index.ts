/**
 * Job Classifier Module
 *
 * Classifies job postings by extracting:
 * - Tags (languages, frameworks, databases, cloud, etc.)
 * - Seniority level (Intern, Junior, Mid-level, Senior, Lead, Director, VP, Chief)
 * - Work mode (remote, hybrid, onsite)
 * - Salary information
 */

// Re-export types
export type { JobClassification, TagMatcher, SeniorityGroup, MatchStrategy } from "./types";

// Re-export individual classifiers for direct use
export { matchTags } from "./tags";
export { classifySeniority } from "./seniority";
export { classifyWorkMode } from "./workMode";
export { extractSalary, extractSalaryRaw } from "./salary";

// Import for internal use
import type { JobClassification } from "./types";
import { matchTags } from "./tags";
import { classifySeniority } from "./seniority";
import { classifyWorkMode } from "./workMode";
import { extractSalary } from "./salary";

/**
 * Main job classification function
 * Analyzes a job posting and extracts all relevant metadata
 *
 * @param title - Job title/heading
 * @param desc - Job description
 * @param municipality - Optional municipality/location field
 * @returns Complete job classification with tags, seniority, work mode, and salary
 */
export async function classifyJob(
  title: string,
  desc: string,
  municipality?: string
): Promise<JobClassification> {
  const heading = title || "";
  const description = desc || "";
  const fullText = `${heading}\n${description}`;

  // 1. Match Tags (languages, frameworks, databases, etc.)
  const allTags = matchTags(heading, description, municipality);

  // Filter out seniority and workMode from tags (stored as columns)
  const tags = allTags.filter((t) => !["seniority", "workMode"].includes(t.category));

  // 2. Extract Salary
  const salary = extractSalary(fullText);

  // 3. Classify Work Mode
  const workMode = classifyWorkMode(heading, description);

  // 4. Classify Seniority
  const seniority = classifySeniority(heading, description);

  return {
    tags,
    salary,
    workMode,
    seniority,
  };
}

