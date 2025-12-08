import { streamText, UIMessage, convertToModelMessages, tool, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import pgPromise from "pg-promise";

const pgp = pgPromise();
const g = globalThis as any;
const db = g.__db || pgp(process.env.POSTGRES_URL || "");
if (!g.__db) g.__db = db;

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
  }: {
    messages: UIMessage[];
  } = await req.json();

  // Define the schema for the tool parameters once so we can reuse the inferred type
  const QuerySchema = z.object({
    query: z.string().describe("A safe SELECT SQL query to run against the database"),
  });

  const queryTool = tool<{ query: string }, { data?: any; totalCount?: number; truncated?: boolean; error?: string }>({
    description:
      "Query the PostgreSQL database to get job listings, statistics, or trends. Only SELECT queries are allowed.",
    inputSchema: QuerySchema,
    execute: async ({ query }, _options) => {
      const trimmedQuery = query.trim().toLowerCase();
      if (
        !trimmedQuery.startsWith("select") ||
        trimmedQuery.includes("drop") ||
        trimmedQuery.includes("delete") ||
        trimmedQuery.includes("update") ||
        trimmedQuery.includes("insert") ||
        trimmedQuery.includes("alter") ||
        trimmedQuery.includes("truncate")
      ) {
        return {
          error: "Only SELECT queries are allowed for safety reasons.",
        };
      }
      try {
        const results = await db.any(query);
        const limitedResults = results.slice(0, 100);
        return {
          data: limitedResults,
          totalCount: results.length,
          truncated: results.length > 100,
        };
      } catch (error: any) {
        return { error: error?.message || "Database query failed" };
      }
    },
  });

  const result = streamText({
    model: openai("gpt-5-mini"),
    messages: convertToModelMessages(messages),
    system: `You are an expert Data Analyst and Job Market Specialist for the Finnish tech sector.
You have access to a PostgreSQL database with job listings.

### Database Schema
- **jobs**: id, heading, company_name, municipality_name, work_mode, active, date_posted, salary_min, salary_max, salary_currency, descr.
- **tags**: id, name, category.
- **job_tags**: links jobs to tags.

### STANDARD TAGS REFERENCE (Use these EXACT names)
*If a user asks for "Developer", check ALL relevant tags below:*
- **Positions**: 'Software Developer', 'Full Stack', 'Back End', 'Front End', 'DevOps Engineer', 'Data Engineer', 'Cloud Engineer', 'System Architect', 'Mobile Developer', 'Game Developer', 'QA Engineer'.
- **Languages**: 'Python', 'TypeScript', 'JavaScript', 'Java', 'C#', 'C++', 'Go', 'Rust', 'SQL'.
- **Frameworks**: 'React', 'Node.js', 'Vue.js', 'Angular', '.NET', 'Spring Boot', 'Django', 'Flask'.
- **Cloud/Infra**: 'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform'.
- **Locations**: 'Kuopio', 'Helsinki', 'Tampere', 'Oulu', 'Turku', 'Espoo', 'Vantaa'.

### CRITICAL RULES FOR QUERIES
1. **Case Insensitivity IS MANDATORY**: 
   - NEVER assume capitalization. 
   - ALWAYS use \`ILIKE\` for text comparisons (categories, names, headings).
   - Example: \`t.category ILIKE 'locations'\` (NOT \`= 'Locations'\`)

2. **Broaden Role Searches (Tags + Headings)**:
   - Do NOT rely on tags alone. Tags can be missing.
   - Logic: \`WHERE (t.name ILIKE '%developer%' OR j.heading ILIKE '%developer%')\`
   - User: "Python jobs" -> Search for 'Python' tag OR 'Django'/'Flask' tags OR 'Python' in heading.

3. **Search Logic for Locations**:
   - Use OR logic to catch remote/hybrid listings.
   - Logic: \`WHERE (j.municipality_name ILIKE '%kuopio%' OR (t.category ILIKE 'locations' AND t.name ILIKE '%kuopio%'))\`

4. **Salary Analysis**:
   - Use: \`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (salary_min + salary_max) / 2)\` for median.
   - If mostly NULL, state that clearly.

5. **Status**:
   - Always return counts for Active vs Inactive unless asked otherwise.

6. **The "Zero Results" Fail-Safe**:
   - If your specific query returns 0 rows, but the request was broad (e.g. "Developer jobs"), run a second, broader query immediately to check if your filters were too strict.
   - *Example:* If "Python jobs in Kuopio" returns 0, checking "Python jobs" (anywhere) or "Jobs in Kuopio" (any role) helps diagnosis.

### Response Style
- Start with the summary numbers.
- Explicitly mention which filters you used (e.g., "I searched for jobs with the 'Python' tag or 'Python' in the title...").`,
    tools: {
      queryDatabase: queryTool,
    },
    stopWhen: stepCountIs(5),
  });

  // send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}
