import { NextResponse } from 'next/server';
import pgPromise from 'pg-promise';

const pgp = pgPromise();
const g = globalThis as any;
const db = g.__db || pgp(process.env.POSTGRES_URL || '');
if (!g.__db) g.__db = db;

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // -- Filters --
  const langs = searchParams.get('languages')?.split(',').filter(Boolean) || [];
  const frameworks = searchParams.get('frameworks')?.split(',').filter(Boolean) || [];
  const seniority = searchParams.get('seniority')?.split(',').filter(Boolean) || [];
  const workMode = searchParams.get('workMode')?.split(',').filter(Boolean) || [];
  const companies = searchParams.get('companies')?.split(',').filter(Boolean) || [];

  // -- Toggles --
  const hideDeleted = searchParams.get('hideDeleted') !== 'false';
  const hideOld = searchParams.get('hideOld') !== 'false';

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 50;
  const offset = (page - 1) * limit;

  // -- Query Construction --
  const conditions: string[] = [];
  const args: any[] = [];

  if (hideDeleted) {
    conditions.push("active = TRUE");
  }
  if (hideOld) {
    conditions.push("date_posted >= NOW() - INTERVAL '90 days'");
  }

  // Tag Filters Helper
  const addTagFilter = (items: string[], category: string) => {
    if (items.length === 0) return;
    const placeholders = items.map((_, i) => `$${args.length + i + 1}`).join(',');
    conditions.push(`
      id IN (
        SELECT job_id FROM job_tags jt 
        JOIN tags t ON jt.tag_id = t.id 
        WHERE t.category = '${category}' AND lower(t.name) IN (${placeholders.toLowerCase()})
      )
    `);
    args.push(...items.map(s => s.toLowerCase()));
  };

  addTagFilter(langs, 'languages');
  addTagFilter(frameworks, 'frameworks');
  addTagFilter(searchParams.get('databases')?.split(',').filter(Boolean) || [], 'databases');
  addTagFilter(searchParams.get('cloud')?.split(',').filter(Boolean) || [], 'cloud');
  addTagFilter(searchParams.get('devops')?.split(',').filter(Boolean) || [], 'devops');
  addTagFilter(searchParams.get('dataScience')?.split(',').filter(Boolean) || [], 'dataScience');
  addTagFilter(searchParams.get('cyberSecurity')?.split(',').filter(Boolean) || [], 'cyberSecurity');
  addTagFilter(searchParams.get('softSkills')?.split(',').filter(Boolean) || [], 'softSkills');
  addTagFilter(searchParams.get('positions')?.split(',').filter(Boolean) || [], 'positions');
  addTagFilter(searchParams.get('locations')?.split(',').filter(Boolean) || [], 'locations');

  // Column Filters
  if (seniority.length) {
    const p = seniority.map((_, i) => `$${args.length + i + 1}`).join(',');
    conditions.push(`lower(seniority) IN (${p})`);
    args.push(...seniority.map(s => s.toLowerCase()));
  }
  if (workMode.length) {
    const p = workMode.map((_, i) => `$${args.length + i + 1}`).join(',');
    conditions.push(`lower(work_mode) IN (${p})`);
    args.push(...workMode.map(s => s.toLowerCase()));
  }
  if (companies.length) {
    const p = companies.map((_, i) => `$${args.length + i + 1}`).join(',');
    conditions.push(`lower(company_name) IN (${p})`);
    args.push(...companies.map(s => s.toLowerCase()));
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Helper to build proper SQL for facets depending on whether WHERE clause exists
  const buildFacetQuery = (column: string, categoryLabel: string) => {
    const prefix = whereClause ? `${whereClause} AND` : 'WHERE';
    return `
      SELECT '${categoryLabel}' as category, ${column} as name, COUNT(*) as count 
      FROM jobs 
      ${prefix} ${column} IS NOT NULL 
      GROUP BY ${column}
    `;
  };

  try {
    // Parallelize queries for performance
    const [countRes, jobs, tagFacets, colFacets] = await Promise.all([
      // 1. Total Count
      db.one(`SELECT count(*) FROM jobs ${whereClause}`, args),

      // 2. Job Results
      db.any(`
        SELECT id, slug, heading, company_name, municipality_name, date_posted, work_mode, seniority, salary_min, salary_max, salary_currency
        FROM jobs
               ${whereClause}
        ORDER BY date_posted DESC, id DESC
        LIMIT ${limit} OFFSET ${offset}
      `, args),

      // 3. Tag Facets (Languages, Frameworks...)
      db.any(`
        SELECT t.category, t.name, COUNT(*) as count
        FROM job_tags jt
               JOIN tags t ON jt.tag_id = t.id
        WHERE jt.job_id IN (SELECT id FROM jobs ${whereClause})
        GROUP BY t.category, t.name
      `, args),

      // 4. Column Facets (WorkMode, Seniority, Companies)
      db.any(`
          ${buildFacetQuery('work_mode', 'workMode')}
          UNION ALL
          ${buildFacetQuery('seniority', 'seniority')}
          UNION ALL
          ${buildFacetQuery('company_name', 'companies')}
        `, args)
    ]);

    // Merge Facets
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
      facets
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}