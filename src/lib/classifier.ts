/**
 * Job Classifier - Backward Compatibility Layer
 *
 * This file re-exports from the new modular classifier structure.
 * Import from '@/lib/classifier' or '@/lib/classifier/index' for the same functionality.
 *
 * The classifier has been split into separate modules:
 * - classifier/types.ts    - Type definitions
 * - classifier/utils.ts    - Shared utilities
 * - classifier/tags.ts     - Tag matching logic
 * - classifier/seniority.ts - Seniority classification
 * - classifier/workMode.ts - Work mode classification
 * - classifier/salary.ts   - Salary extraction
 * - classifier/index.ts    - Main exports
 */

export {
  // Types
  type JobClassification,
  type TagMatcher,
  type SeniorityGroup,
  type MatchStrategy,

  // Functions
  classifyJob,
  matchTags,
  classifySeniority,
  classifyWorkMode,
  extractSalary,
  extractSalaryRaw,
} from "./classifier/index";
