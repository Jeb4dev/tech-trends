import { extractSalaryRaw } from "@/salary";
import { NextResponse } from "next/server";
import pgPromise from "pg-promise";

const pgp = pgPromise();
const g = globalThis as any;
const db = g.__db || pgp(process.env.POSTGRES_URL || "");
if (!g.__db) g.__db = db;

export const dynamic = "force-dynamic";

type DbJobRow = {
  id: number;
  slug: string;
  heading: string | null;
  descr: string | null;
  company_name: string | null;
  municipality_name: string | null;
  date_posted: string | null;
  work_mode: string | null;
  seniority: string | null;
  salary_min: string | number | null;
  salary_max: string | number | null;
  salary_currency: string | null;
  ai_classified_at: string | null;
};

const normalizeNumeric = (value: string | number | null): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = typeof value === "string" ? parseFloat(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

const deriveSalary = (row: DbJobRow) => {
  const storedMin = normalizeNumeric(row.salary_min);
  const storedMax = normalizeNumeric(row.salary_max);
  if (storedMin || storedMax) {
    return {
      min: storedMin,
      max: storedMax,
      label: null,
    };
  }
  const extracted = extractSalaryRaw(`${row.heading || ""}\n${row.descr || ""}`);
  const min = extracted?.min ?? null;
  const max = extracted?.max ?? null;
  return { min, max, label: extracted?.label ?? null };
};

// Category to DB mapping
const TAG_CATEGORIES = [
  "languages",
  "frameworks",
  "databases",
  "cloud",
  "devops",
  "dataScience",
  "cyberSecurity",
  "softSkills",
  "positions",
  "locations",
];
const COLUMN_CATEGORIES: Record<string, string> = {
  workMode: "work_mode",
  seniority: "seniority",
  companies: "company_name",
};

// Parse raw query with mixed AND/OR into SQL
function parseRawQueryToSQL(rawQuery: string, args: any[]): { sql: string; newArgs: any[] } | null {
  if (!rawQuery.trim()) return null;

  const normalized = rawQuery.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

  // Tokenize: extract all category:"value" tokens with their positions and NOT prefix
  const tokenRegex = /(NOT\s+)?(\w+):"([^"]+)"/g;
  const tokens: Array<{
    fullMatch: string;
    isNot: boolean;
    category: string;
    value: string;
    start: number;
    end: number;
  }> = [];

  let match;
  while ((match = tokenRegex.exec(normalized)) !== null) {
    tokens.push({
      fullMatch: match[0],
      isNot: !!match[1],
      category: match[2],
      value: match[3],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  if (tokens.length === 0) return null;

  // Build SQL by converting each token to a SQL condition
  // and preserving the AND/OR/() structure
  let sql = normalized;
  const newArgs = [...args];

  // Replace tokens from end to start to preserve positions
  const sortedTokens = [...tokens].sort((a, b) => b.start - a.start);

  for (const token of sortedTokens) {
    const condition = buildTokenCondition(token.category, token.value, token.isNot, newArgs);
    if (condition) {
      sql = sql.slice(0, token.start) + condition + sql.slice(token.end);
    } else {
      // Invalid category - replace with TRUE to not break the query
      sql = sql.slice(0, token.start) + "TRUE" + sql.slice(token.end);
    }
  }

  // Clean up any remaining issues
  sql = sql
    .replace(/\bAND\s+AND\b/gi, "AND")
    .replace(/\bOR\s+OR\b/gi, "OR")
    .replace(/\(\s*AND/gi, "(")
    .replace(/\(\s*OR/gi, "(")
    .replace(/AND\s*\)/gi, ")")
    .replace(/OR\s*\)/gi, ")")
    .trim();

  // Remove leading/trailing operators
  sql = sql
    .replace(/^\s*AND\s+/i, "")
    .replace(/^\s*OR\s+/i, "")
    .replace(/\s+AND\s*$/i, "")
    .replace(/\s+OR\s*$/i, "")
    .trim();

  if (!sql || sql === "TRUE") return null;

  return { sql: `(${sql})`, newArgs };
}

function buildTokenCondition(category: string, value: string, isNot: boolean, args: any[]): string | null {
  const lowerValue = value.toLowerCase();

  // Check if it's a tag category
  if (TAG_CATEGORIES.includes(category)) {
    const paramIndex = args.length + 1;
    args.push(lowerValue);

    if (isNot) {
      return `id NOT IN (
        SELECT job_id FROM job_tags jt 
        JOIN tags t ON jt.tag_id = t.id 
        WHERE t.category = '${category}' AND lower(t.name) = $${paramIndex}
      )`;
    } else {
      return `id IN (
        SELECT job_id FROM job_tags jt 
        JOIN tags t ON jt.tag_id = t.id 
        WHERE t.category = '${category}' AND lower(t.name) = $${paramIndex}
      )`;
    }
  }

  // Check if it's a column category
  const columnName = COLUMN_CATEGORIES[category];
  if (columnName) {
    const paramIndex = args.length + 1;
    args.push(lowerValue);

    if (isNot) {
      return `(lower(${columnName}) != $${paramIndex} OR ${columnName} IS NULL)`;
    } else {
      return `lower(${columnName}) = $${paramIndex}`;
    }
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // -- Sorting --
  const SORT_ORDER: Record<string, string> = {
    date_desc: "date_posted DESC NULLS LAST, id DESC",
    date_asc: "date_posted ASC NULLS LAST, id DESC",
    salary_desc: "COALESCE(salary_max, salary_min) DESC NULLS LAST, date_posted DESC, id DESC",
    salary_asc: "COALESCE(salary_min, salary_max) ASC NULLS LAST, date_posted DESC, id DESC",
    company_asc: "LOWER(company_name) ASC NULLS LAST, date_posted DESC, id DESC",
  };
  const sortParam = searchParams.get("sort") || "date_desc";
  const orderByClause = SORT_ORDER[sortParam] || SORT_ORDER.date_desc;

  // -- Toggles --
  const hideDeleted = searchParams.get("hideDeleted") !== "false";
  const hideOld = searchParams.get("hideOld") !== "false";

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 50;
  const offset = (page - 1) * limit;

  // -- Filter Logic --
  const conditions: string[] = [];
  const args: any[] = [];

  if (hideDeleted) conditions.push("active = TRUE");
  if (hideOld) conditions.push("date_posted::date >= (NOW() - INTERVAL '90 days')::date");

  // Check for rawQuery (complex AND/OR expressions)
  const rawQuery = searchParams.get("rawQuery");
  if (rawQuery) {
    const parsed = parseRawQueryToSQL(rawQuery, args);
    if (parsed) {
      conditions.push(parsed.sql);
      args.length = 0;
      args.push(...parsed.newArgs);
    }
  } else {
    // Use simple filter params if no rawQuery
    // Helper to parse advanced params: key_in, key_ex, key_op
    const getFilter = (key: string) => ({
      inc:
        searchParams
          .get(`${key}_in`)
          ?.split(",")
          .filter(Boolean)
          .map((s) => s.trim().toLowerCase()) || [],
      exc:
        searchParams
          .get(`${key}_ex`)
          ?.split(",")
          .filter(Boolean)
          .map((s) => s.trim().toLowerCase()) || [],
      op: searchParams.get(`${key}_op`) === "AND" ? "AND" : "OR",
    });

    // 1. Tag Filters (Languages, Frameworks, etc.)
    // Supports: OR (Match Any), AND (Match All), NOT (Exclude)
    const applyTagFilter = (category: string, key: string) => {
      const { inc, exc, op } = getFilter(key);

      // Inclusion Logic
      if (inc.length > 0) {
        if (op === "OR") {
          // Match Any
          const placeholders = inc.map((_, i) => `$${args.length + i + 1}`).join(",");
          conditions.push(`
          id IN (
            SELECT job_id FROM job_tags jt 
            JOIN tags t ON jt.tag_id = t.id 
            WHERE t.category = '${category}' AND lower(t.name) IN (${placeholders})
          )
        `);
          args.push(...inc);
        } else {
          // Match All (AND)
          // Ensure the job has *all* the selected tags from this category
          const placeholders = inc.map((_, i) => `$${args.length + i + 1}`).join(",");
          conditions.push(`
          id IN (
            SELECT job_id FROM job_tags jt 
            JOIN tags t ON jt.tag_id = t.id 
            WHERE t.category = '${category}' AND lower(t.name) IN (${placeholders})
            GROUP BY job_id
            HAVING COUNT(DISTINCT lower(t.name)) = ${inc.length}
          )
        `);
          args.push(...inc);
        }
      }

      // Exclusion Logic (NOT)
      if (exc.length > 0) {
        const placeholders = exc.map((_, i) => `$${args.length + i + 1}`).join(",");
        conditions.push(`
        id NOT IN (
          SELECT job_id FROM job_tags jt 
          JOIN tags t ON jt.tag_id = t.id 
          WHERE t.category = '${category}' AND lower(t.name) IN (${placeholders})
        )
      `);
        args.push(...exc);
      }
    };

    applyTagFilter("languages", "languages");
    applyTagFilter("frameworks", "frameworks");
    applyTagFilter("databases", "databases");
    applyTagFilter("cloud", "cloud");
    applyTagFilter("devops", "devops");
    applyTagFilter("dataScience", "dataScience");
    applyTagFilter("cyberSecurity", "cyberSecurity");
    applyTagFilter("softSkills", "softSkills");
    applyTagFilter("positions", "positions");
    applyTagFilter("locations", "locations");

    // 2. Column Filters (WorkMode, Seniority, Companies)
    // Supports: OR (Match Any), NOT (Exclude). "AND" is logically impossible for single-value columns.
    const applyColumnFilter = (colName: string, key: string) => {
      const { inc, exc } = getFilter(key);

      if (inc.length > 0) {
        const p = inc.map((_, i) => `$${args.length + i + 1}`).join(",");
        conditions.push(`lower(${colName}) IN (${p})`);
        args.push(...inc);
      }

      if (exc.length > 0) {
        const p = exc.map((_, i) => `$${args.length + i + 1}`).join(",");
        conditions.push(`(lower(${colName}) NOT IN (${p}) OR ${colName} IS NULL)`);
        args.push(...exc);
      }
    };

    applyColumnFilter("work_mode", "workMode");
    applyColumnFilter("seniority", "seniority");
    applyColumnFilter("company_name", "companies");
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // Facet Query Builder
  const buildFacetQuery = (column: string, categoryLabel: string) => {
    const prefix = whereClause ? `${whereClause} AND` : "WHERE";
    return `
      SELECT '${categoryLabel}' as category, ${column} as name, COUNT(*) as count 
      FROM jobs 
      ${prefix} ${column} IS NOT NULL 
      GROUP BY ${column}
    `;
  };

  try {
    const [countRes, jobs, tagFacets, colFacets] = await Promise.all([
      db.one(`SELECT count(*) FROM jobs ${whereClause}`, args),
      db.any(
        `
        SELECT id, slug, heading, descr, company_name, municipality_name, date_posted, work_mode, seniority, salary_min, salary_max, salary_currency, ai_classified_at
        FROM jobs
               ${whereClause}
        ORDER BY ${orderByClause}
        LIMIT ${limit} OFFSET ${offset}
      `,
        args,
      ),
      db.any(
        `
        SELECT t.category, t.name, COUNT(*) as count
        FROM job_tags jt
               JOIN tags t ON jt.tag_id = t.id
        WHERE jt.job_id IN (SELECT id FROM jobs ${whereClause})
        GROUP BY t.category, t.name
      `,
        args,
      ),
      db.any(
        `
          ${buildFacetQuery("work_mode", "workMode")}
          UNION ALL
          ${buildFacetQuery("seniority", "seniority")}
          UNION ALL
          ${buildFacetQuery("company_name", "companies")}
        `,
        args,
      ),
    ]);

    // Fetch location tags for jobs in this result set
    const jobIds = (jobs as DbJobRow[]).map((j) => j.id);
    let locationTagsMap: Record<number, string[]> = {};

    // Countries should appear after cities in the locations list
    const COUNTRIES = new Set([
      "Finland",
      "Sweden",
      "Norway",
      "Germany",
      "Estonia",
      "Spain",
      "Greece",
      "Ireland",
      "France",
      "Denmark",
      "Netherlands",
      "Belgium",
      "Poland",
      "United Kingdom",
      "UK",
      "USA",
      "United States",
    ]);

    if (jobIds.length > 0) {
      const locationTags = await db.any(
        `
        SELECT jt.job_id, t.name
        FROM job_tags jt
        JOIN tags t ON jt.tag_id = t.id
        WHERE t.category = 'locations' AND jt.job_id IN ($1:csv)
        ORDER BY jt.job_id, t.name
        `,
        [jobIds],
      );

      // Group locations by job_id
      locationTags.forEach((row: { job_id: number; name: string }) => {
        if (!locationTagsMap[row.job_id]) {
          locationTagsMap[row.job_id] = [];
        }
        locationTagsMap[row.job_id].push(row.name);
      });

      // Sort each job's locations: cities first, then countries
      for (const jobId of Object.keys(locationTagsMap)) {
        const locs = locationTagsMap[Number(jobId)];
        locs.sort((a, b) => {
          const aIsCountry = COUNTRIES.has(a);
          const bIsCountry = COUNTRIES.has(b);
          if (aIsCountry && !bIsCountry) return 1; // countries after cities
          if (!aIsCountry && bIsCountry) return -1; // cities before countries
          return a.localeCompare(b); // alphabetical within same type
        });
      }
    }

    const facets: Record<string, Record<string, number>> = {};
    const merge = (rows: any[]) => {
      rows.forEach((row: any) => {
        if (!row.name) return;
        if (!facets[row.category]) facets[row.category] = {};
        facets[row.category][row.name] = parseInt(row.count, 10);
      });
    };
    merge(tagFacets);
    merge(colFacets);

    const formattedJobs = (jobs as DbJobRow[]).map((job) => {
      const { descr, ...rest } = job;
      const salary = deriveSalary(job);
      const locations = locationTagsMap[job.id] || [];
      return {
        ...rest,
        salary_min: salary.min,
        salary_max: salary.max,
        salary_label: salary.label,
        locations, // Array of city names from tags
      };
    });

    return NextResponse.json({
      count: parseInt(countRes.count, 10),
      page,
      results: formattedJobs,
      facets,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
