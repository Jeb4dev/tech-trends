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
     HAVING SUM(CASE WHEN ds.date > CURRENT_DATE - $1 THEN ds.count ELSE 0 END) > 0
     ORDER BY (COALESCE(SUM(CASE WHEN ds.date > CURRENT_DATE - $1 THEN ds.count ELSE 0 END), 0) -
               COALESCE(SUM(CASE WHEN ds.date BETWEEN CURRENT_DATE - ($1 * 2) AND CURRENT_DATE - $1 THEN ds.count ELSE 0 END), 0)) DESC
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
