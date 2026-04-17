import pgPromise, { IMain, IDatabase } from "pg-promise";

// Reuse the singleton pg-promise pattern from data-sync.ts
const g = globalThis as unknown as {
  __pgp?: IMain;
  __db?: IDatabase<object>;
};

const pgp: IMain = g.__pgp ?? pgPromise();
if (!g.__pgp) g.__pgp = pgp;

const connection = process.env.POSTGRES_URL || "";
const db: IDatabase<object> = g.__db ?? pgp(connection);
if (!g.__db) g.__db = db;

export interface JobStats {
  totalJobs: number;
  totalCompanies: number;
}

export async function getActiveJobStats(): Promise<JobStats> {
  const row = await db.one<{ total_jobs: string; total_companies: string }>(
    `SELECT count(*) as total_jobs, count(DISTINCT company_name) as total_companies
     FROM jobs WHERE active = TRUE`,
  );
  return {
    totalJobs: parseInt(row.total_jobs, 10),
    totalCompanies: parseInt(row.total_companies, 10),
  };
}

export interface TrendingKeyword {
  category: string;
  name: string;
  recent: number;
  previous: number;
  delta: number;
}

export async function getTrendingKeywords(
  days: number = 30,
  limit: number = 5,
): Promise<TrendingKeyword[]> {
  const rows = await db.any<{
    category: string;
    name: string;
    recent: string;
    previous: string;
  }>(
    `SELECT t.category, t.name,
       COALESCE(SUM(CASE WHEN ds.date > CURRENT_DATE - $1 THEN ds.count ELSE 0 END), 0) as recent,
       COALESCE(SUM(CASE WHEN ds.date BETWEEN CURRENT_DATE - ($1 * 2) AND CURRENT_DATE - $1 THEN ds.count ELSE 0 END), 0) as previous
     FROM daily_stats ds
     JOIN tags t ON ds.tag_id = t.id
     WHERE ds.date > CURRENT_DATE - ($1 * 2)
     GROUP BY t.category, t.name
     HAVING SUM(CASE WHEN ds.date > CURRENT_DATE - $1 THEN ds.count ELSE 0 END) >= 5
     ORDER BY (
       COALESCE(SUM(CASE WHEN ds.date > CURRENT_DATE - $1 THEN ds.count ELSE 0 END), 0) -
       COALESCE(SUM(CASE WHEN ds.date BETWEEN CURRENT_DATE - ($1 * 2) AND CURRENT_DATE - $1 THEN ds.count ELSE 0 END), 0)
     ) / SQRT(
       COALESCE(SUM(CASE WHEN ds.date BETWEEN CURRENT_DATE - ($1 * 2) AND CURRENT_DATE - $1 THEN ds.count ELSE 0 END), 0) + 5.0
     ) DESC
     LIMIT $2`,
    [days, limit],
  );
  return rows.map((r) => ({
    category: r.category,
    name: r.name,
    recent: parseInt(r.recent, 10),
    previous: parseInt(r.previous, 10),
    delta: parseInt(r.recent, 10) - parseInt(r.previous, 10),
  }));
}

export interface TopKeyword {
  category: string;
  name: string;
  count: number;
}

export async function getTopKeywords(
  category: string | null,
  limit: number = 5,
): Promise<TopKeyword[]> {
  const whereClause = category ? "AND t.category = $2" : "";
  const params: (number | string)[] = [limit];
  if (category) params.push(category);

  const rows = await db.any<{ category: string; name: string; count: string }>(
    `SELECT t.category, t.name, count(*) as count
     FROM job_tags jt
     JOIN tags t ON jt.tag_id = t.id
     JOIN jobs j ON jt.job_id = j.id
     WHERE j.active = TRUE ${whereClause}
     GROUP BY t.category, t.name
     ORDER BY count DESC
     LIMIT $1`,
    params,
  );
  return rows.map((r) => ({
    category: r.category,
    name: r.name,
    count: parseInt(r.count, 10),
  }));
}

export interface CategoryStat {
  category: string;
  totalJobs: number;
  topKeywords: { name: string; count: number }[];
}

export async function getCategoryStats(): Promise<CategoryStat[]> {
  // Get total jobs per category
  const totals = await db.any<{ category: string; total: string }>(
    `SELECT t.category, count(DISTINCT jt.job_id) as total
     FROM job_tags jt
     JOIN tags t ON jt.tag_id = t.id
     JOIN jobs j ON jt.job_id = j.id
     WHERE j.active = TRUE
     GROUP BY t.category
     ORDER BY total DESC`,
  );

  // Get top 3 keywords per category
  const topKw = await db.any<{ category: string; name: string; cnt: string }>(
    `SELECT category, name, cnt FROM (
       SELECT t.category, t.name, count(*) as cnt,
              ROW_NUMBER() OVER (PARTITION BY t.category ORDER BY count(*) DESC) as rn
       FROM job_tags jt
       JOIN tags t ON jt.tag_id = t.id
       JOIN jobs j ON jt.job_id = j.id
       WHERE j.active = TRUE
       GROUP BY t.category, t.name
     ) sub WHERE rn <= 3`,
  );

  const kwByCategory = new Map<string, { name: string; count: number }[]>();
  for (const row of topKw) {
    const list = kwByCategory.get(row.category) || [];
    list.push({ name: row.name, count: parseInt(row.cnt, 10) });
    kwByCategory.set(row.category, list);
  }

  return totals.map((t) => ({
    category: t.category,
    totalJobs: parseInt(t.total, 10),
    topKeywords: kwByCategory.get(t.category) || [],
  }));
}

// ── Keyword detail page queries ──────────────────────────────────────

export interface TagRow {
  id: number;
  category: string;
  name: string;
}

export async function getTagByKeyword(category: string, name: string): Promise<TagRow | null> {
  return db.oneOrNone<TagRow>(
    `SELECT id, category, name FROM tags WHERE category = $1 AND LOWER(name) = LOWER($2)`,
    [category, name],
  );
}

export interface TrendDataPoint {
  date: string;
  count: number;
}

export async function getKeywordTrendData(tagId: number, days: number = 90): Promise<TrendDataPoint[]> {
  const rows = await db.any<{ date: string; count: string }>(
    `SELECT date::text, count FROM daily_stats
     WHERE tag_id = $1 AND date > CURRENT_DATE - $2
     ORDER BY date ASC`,
    [tagId, days],
  );
  return rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) }));
}

export async function getKeywordActiveJobCount(tagId: number): Promise<number> {
  const row = await db.one<{ cnt: string }>(
    `SELECT COUNT(DISTINCT jt.job_id) as cnt
     FROM job_tags jt JOIN jobs j ON jt.job_id = j.id
     WHERE jt.tag_id = $1 AND j.active = TRUE`,
    [tagId],
  );
  return parseInt(row.cnt, 10);
}

export interface SalaryStats {
  sampleCount: number;
  avg: number;
  median: number;
  min: number;
  max: number;
}

export async function getKeywordSalaryStats(tagId: number): Promise<SalaryStats | null> {
  const row = await db.oneOrNone<{
    sample_count: string;
    avg_sal: string;
    median_sal: string;
    min_sal: string;
    max_sal: string;
  }>(
    `SELECT
       COUNT(*) as sample_count,
       ROUND(AVG((salary_min + salary_max) / 2.0)) as avg_sal,
       ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (salary_min + salary_max) / 2.0)) as median_sal,
       MIN(salary_min) as min_sal,
       MAX(salary_max) as max_sal
     FROM jobs j
     JOIN job_tags jt ON j.id = jt.job_id
     WHERE jt.tag_id = $1 AND j.active = TRUE
       AND j.salary_min IS NOT NULL AND j.salary_max IS NOT NULL
       AND j.salary_min > 0 AND j.salary_max > 0
     HAVING COUNT(*) > 0`,
    [tagId],
  );
  if (!row) return null;
  return {
    sampleCount: parseInt(row.sample_count, 10),
    avg: parseInt(row.avg_sal, 10),
    median: parseInt(row.median_sal, 10),
    min: parseInt(row.min_sal, 10),
    max: parseInt(row.max_sal, 10),
  };
}

export interface CoOccurrence {
  category: string;
  name: string;
  count: number;
  lift: number;
}

export async function getCoOccurringKeywords(tagId: number, limit: number = 20): Promise<CoOccurrence[]> {
  const rows = await db.any<{ category: string; name: string; co_count: string; lift: string }>(
    `WITH tag2_totals AS (
       SELECT jt.tag_id, COUNT(DISTINCT jt.job_id) AS total
       FROM job_tags jt JOIN jobs j ON jt.job_id = j.id
       WHERE j.active = TRUE
       GROUP BY jt.tag_id
     ),
     tag1_total AS (
       SELECT COUNT(DISTINCT jt.job_id) AS total
       FROM job_tags jt JOIN jobs j ON jt.job_id = j.id
       WHERE jt.tag_id = $1 AND j.active = TRUE
     ),
     grand_total AS (
       SELECT COUNT(*) AS total FROM jobs WHERE active = TRUE
     )
     SELECT t2.category, t2.name,
       COUNT(DISTINCT jt1.job_id) AS co_count,
       ROUND(
         (COUNT(DISTINCT jt1.job_id)::numeric * gt.total) / (tt1.total * t2t.total),
         2
       ) AS lift
     FROM job_tags jt1
     JOIN job_tags jt2 ON jt1.job_id = jt2.job_id AND jt1.tag_id != jt2.tag_id
     JOIN tags t2 ON jt2.tag_id = t2.id
     JOIN tag2_totals t2t ON t2t.tag_id = t2.id
     JOIN jobs j ON jt1.job_id = j.id
     CROSS JOIN tag1_total tt1
     CROSS JOIN grand_total gt
     WHERE jt1.tag_id = $1 AND j.active = TRUE
     GROUP BY t2.category, t2.name, tt1.total, t2t.total, gt.total
     HAVING COUNT(DISTINCT jt1.job_id) >= GREATEST(5, ROUND(tt1.total * 0.03))
     ORDER BY lift DESC
     LIMIT $2`,
    [tagId, limit],
  );
  return rows.map((r) => ({
    category: r.category,
    name: r.name,
    count: parseInt(r.co_count, 10),
    lift: parseFloat(r.lift),
  }));
}

export interface CompanyStat {
  company: string;
  count: number;
}

export async function getTopCompaniesForKeyword(tagId: number, limit: number = 10): Promise<CompanyStat[]> {
  const rows = await db.any<{ company_name: string; cnt: string }>(
    `SELECT j.company_name, COUNT(*) as cnt
     FROM job_tags jt JOIN jobs j ON jt.job_id = j.id
     WHERE jt.tag_id = $1 AND j.active = TRUE AND j.company_name IS NOT NULL
     GROUP BY j.company_name
     ORDER BY cnt DESC
     LIMIT $2`,
    [tagId, limit],
  );
  return rows.map((r) => ({ company: r.company_name, count: parseInt(r.cnt, 10) }));
}

export interface LocationStat {
  city: string;
  count: number;
}

export async function getTopLocationsForKeyword(tagId: number, limit: number = 10): Promise<LocationStat[]> {
  const rows = await db.any<{ municipality_name: string; cnt: string }>(
    `SELECT j.municipality_name, COUNT(*) as cnt
     FROM job_tags jt JOIN jobs j ON jt.job_id = j.id
     WHERE jt.tag_id = $1 AND j.active = TRUE AND j.municipality_name IS NOT NULL
     GROUP BY j.municipality_name
     ORDER BY cnt DESC
     LIMIT $2`,
    [tagId, limit],
  );
  return rows.map((r) => ({ city: r.municipality_name, count: parseInt(r.cnt, 10) }));
}

export interface WorkModeStat {
  mode: string;
  count: number;
}

export async function getWorkModeDistribution(tagId: number): Promise<WorkModeStat[]> {
  const rows = await db.any<{ work_mode: string; cnt: string }>(
    `SELECT COALESCE(j.work_mode, 'unknown') as work_mode, COUNT(*) as cnt
     FROM job_tags jt JOIN jobs j ON jt.job_id = j.id
     WHERE jt.tag_id = $1 AND j.active = TRUE
     GROUP BY j.work_mode
     ORDER BY cnt DESC`,
    [tagId],
  );
  return rows.map((r) => ({ mode: r.work_mode, count: parseInt(r.cnt, 10) }));
}

export interface SeniorityStat {
  level: string;
  count: number;
}

export async function getSeniorityDistribution(tagId: number): Promise<SeniorityStat[]> {
  const rows = await db.any<{ seniority: string; cnt: string }>(
    `SELECT COALESCE(j.seniority, 'unspecified') as seniority, COUNT(*) as cnt
     FROM job_tags jt JOIN jobs j ON jt.job_id = j.id
     WHERE jt.tag_id = $1 AND j.active = TRUE
     GROUP BY j.seniority
     ORDER BY cnt DESC`,
    [tagId],
  );
  return rows.map((r) => ({ level: r.seniority, count: parseInt(r.cnt, 10) }));
}

export interface RecentJob {
  id: number;
  slug: string;
  heading: string;
  descr: string | null;
  company_name: string;
  municipality_name: string | null;
  date_posted: string;
  salary_min: number | null;
  salary_max: number | null;
  work_mode: string | null;
}

export async function getRecentJobsForKeyword(tagId: number, limit: number = 10): Promise<RecentJob[]> {
  return db.any<RecentJob>(
    `SELECT j.id, j.slug, j.heading, j.descr, j.company_name, j.municipality_name,
            j.date_posted::text, j.salary_min, j.salary_max, j.work_mode
     FROM job_tags jt JOIN jobs j ON jt.job_id = j.id
     WHERE jt.tag_id = $1 AND j.active = TRUE
     ORDER BY j.date_posted DESC
     LIMIT $2`,
    [tagId, limit],
  );
}

export interface KeywordSlug {
  category: string;
  name: string;
}

export async function getAllKeywordSlugs(): Promise<KeywordSlug[]> {
  return db.any<KeywordSlug>(
    `SELECT DISTINCT t.category, t.name
     FROM tags t
     JOIN job_tags jt ON t.id = jt.tag_id
     JOIN jobs j ON jt.job_id = j.id
     WHERE j.active = TRUE
     ORDER BY t.category, t.name`,
  );
}

export interface PopularKeyword {
  category: string;
  name: string;
  count: number;
}

export async function getTopKeywordsByCategory(
  categories: string[],
  limitPerCategory: number = 15,
): Promise<PopularKeyword[]> {
  const rows = await db.any<{ category: string; name: string; count: string }>(
    `SELECT category, name, count FROM (
       SELECT t.category, t.name, count(*) AS count,
              ROW_NUMBER() OVER (PARTITION BY t.category ORDER BY count(*) DESC) AS rn
       FROM job_tags jt
       JOIN tags t ON jt.tag_id = t.id
       JOIN jobs j ON jt.job_id = j.id
       WHERE j.active = TRUE AND t.category = ANY($1)
       GROUP BY t.category, t.name
     ) ranked
     WHERE rn <= $2
     ORDER BY category, count DESC`,
    [categories, limitPerCategory],
  );
  return rows.map((r) => ({ category: r.category, name: r.name, count: parseInt(r.count, 10) }));
}

export interface PopularLocation {
  name: string;
  count: number;
}

export async function getTopLocations(limit: number = 10): Promise<PopularLocation[]> {
  const rows = await db.any<{ name: string; count: string }>(
    `SELECT municipality_name AS name, count(*) AS count
     FROM jobs
     WHERE active = TRUE AND municipality_name IS NOT NULL AND municipality_name != ''
     GROUP BY municipality_name
     ORDER BY count DESC
     LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({ name: r.name, count: parseInt(r.count, 10) }));
}
