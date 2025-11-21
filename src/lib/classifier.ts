import * as Keywords from "@/keywords";
import { extractSalaryRaw } from "@/salary";

// Helper to escape regex characters
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Pre-compile matchers from keywords.ts for performance
const tagMatchers = Object.entries(Keywords).flatMap(([category, items]) => {
  if (!Array.isArray(items)) return [];

  return items.map((item: string | string[]) => {
    const variants = Array.isArray(item) ? item : [item];
    const label = variants[0];
    const positives = variants.filter((v) => !v.startsWith("!"));
    const negatives = variants.filter((v) => v.startsWith("!")).map((v) => v.slice(1).toLowerCase());

    const pattern = positives.map(escapeRegExp).join("|");
    const regex = new RegExp(`(?:^|\\s|\\(|\\/|,)(${pattern})(?=$|\\s|\\)|\\/|\\.|,)`, "i");

    return { category, label, regex, negatives };
  });
});

export interface JobClassification {
  tags: { category: string; name: string }[];
  salary?: { min: number; max: number; currency: string };
  workMode: string;
  seniority: string | null;
}

export async function classifyJob(title: string, desc: string, municipality?: string): Promise<JobClassification> {
  const fullText = `${title}\n${desc}\n${municipality || ""}`;
  const fullLower = fullText.toLowerCase();

  // 1. Match Tags
  const tags = [];
  for (const m of tagMatchers) {
    if (m.negatives.some((neg) => fullLower.includes(neg))) continue;
    if (m.regex.test(fullText)) {
      // Normalize category names if needed (e.g., 'location' -> 'locations')
      // keywords.ts export is 'location', but frontend uses 'locations'.
      // Let's normalize to 'locations' for consistency.
      const category = m.category === "location" ? "locations" : m.category;
      tags.push({ category, name: m.label });
    }
  }

  // 2. Extract Salary
  const salRaw = extractSalaryRaw(fullText);
  let salary;
  if (salRaw && salRaw.min) {
    salary = {
      min: salRaw.min,
      max: salRaw.max || salRaw.min,
      currency: "EUR",
    };
  }

  // 3. Work Mode
  let workMode = "unknown";
  if (/remote|etätyö/i.test(fullText)) workMode = "remote";
  else if (/hybrid|hybridi/i.test(fullText)) workMode = "hybrid";
  else if (/on-site|lähityö|toimistolla/i.test(fullText)) workMode = "onsite";

  // 4. Seniority
  let seniority = null;
  const senTag = tags.find((t) => t.category === "seniority");
  if (senTag) seniority = senTag.name;

  return {
    // Stop filtering out 'location' (or 'locations').
    // Keep excluding 'seniority' and 'workMode' as tags since they are columns.
    tags: tags.filter((t) => !["seniority", "workMode"].includes(t.category)),
    salary,
    workMode,
    seniority,
  };
}
