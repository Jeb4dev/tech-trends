/**
 * Salary extraction wrapper
 * Re-exports from the main salary module for convenience
 */

import { extractSalaryRaw as extractRaw } from "@/salary";

export { extractSalaryRaw } from "@/salary";

export interface SalaryInfo {
  min: number;
  max: number;
  currency: string;
}

/**
 * Extract salary information from job text
 *
 * @param text - Job title and description combined
 * @returns Salary info object or undefined if no salary found
 */
export function extractSalary(text: string): SalaryInfo | undefined {
  const salRaw = extractRaw(text);

  if (salRaw && salRaw.min) {
    return {
      min: salRaw.min,
      max: salRaw.max || salRaw.min,
      currency: "EUR",
    };
  }

  return undefined;
}

