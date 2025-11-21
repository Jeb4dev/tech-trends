import { NextResponse } from "next/server";
import pgPromise from "pg-promise";

const pgp = pgPromise();
const g = globalThis as any;
const db = g.__db || pgp(process.env.POSTGRES_URL || "");
if (!g.__db) g.__db = db;

export const dynamic = "force-dynamic";

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
  if (hideOld) conditions.push("date_posted >= NOW() - INTERVAL '90 days'");

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
        SELECT id, slug, heading, company_name, municipality_name, date_posted, work_mode, seniority, salary_min, salary_max, salary_currency
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

    return NextResponse.json({
      count: parseInt(countRes.count, 10),
      page,
      results: jobs,
      facets,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
