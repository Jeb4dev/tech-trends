import { IMain, IDatabase } from "pg-promise";
import pgPromise from "pg-promise";
import { ResponseData } from "@/types";
import { classifyJob } from "@/lib/classifier";
import { getWorkingMode } from "@/lib/openai"; // Added import
import { notifySubscribers } from "@/lib/subscriptions";

// Ensure a single pg-promise instance and DB connection across the process
const g = globalThis as unknown as {
  __pgp?: IMain;
  __db?: IDatabase<any>;
};

const pgp: IMain = g.__pgp ?? pgPromise();
if (!g.__pgp) g.__pgp = pgp;

const connection = process.env.POSTGRES_URL || "";
if (!connection) {
  console.warn("[data-sync] POSTGRES_URL is not set; database operations will fail");
}
// @ts-ignore - type inferred by pg-promise
const db: IDatabase<any> = g.__db ?? pgp(connection);
if (!g.__db) g.__db = db;

export async function initializeDatabase() {
  // Create tables if they don't exist
  await db.tx(async (t: any) => {
    // Original schema
    await t.none(`
      CREATE TABLE IF NOT EXISTS jobs (
                                        id SERIAL PRIMARY KEY,
                                        slug TEXT UNIQUE,
                                        heading TEXT,
                                        descr TEXT,
                                        company_name TEXT,
                                        municipality_name TEXT,
                                        date_posted TEXT,
                                        last_seen_at TIMESTAMPTZ,
                                        work_mode TEXT
      )
    `);

    // New structured columns
    await t.none(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ`);
    await t.none(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_mode TEXT`);
    await t.none(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE`);
    await t.none(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_min NUMERIC`);
    await t.none(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_max NUMERIC`);
    await t.none(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(10)`);
    await t.none(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS seniority VARCHAR(50)`);

    // New Normalized Tables for V2
    await t.none(`
      CREATE TABLE IF NOT EXISTS tags (
                                        id SERIAL PRIMARY KEY,
                                        category VARCHAR(50) NOT NULL,
                                        name VARCHAR(100) NOT NULL,
                                        UNIQUE(category, name)
      )
    `);

    await t.none(`
      CREATE TABLE IF NOT EXISTS job_tags (
                                            job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
                                            tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
                                            PRIMARY KEY (job_id, tag_id)
      )
    `);

    await t.none(`
      CREATE TABLE IF NOT EXISTS daily_stats (
                                               date DATE NOT NULL,
                                               tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
                                               count INTEGER DEFAULT 0,
                                               PRIMARY KEY (date, tag_id)
      )
    `);

    await t.none(`
      CREATE TABLE IF NOT EXISTS app_meta (
                                            key TEXT PRIMARY KEY,
                                            value TEXT
      )
    `);

    await t.none(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        confirm_token TEXT UNIQUE,
        confirmed BOOLEAN DEFAULT FALSE,
        criteria JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_notified_at TIMESTAMPTZ
      )
    `);
  });
}

async function getMeta(key: string): Promise<string | null> {
  try {
    const row = await db.oneOrNone(`SELECT value FROM app_meta WHERE key = $1`, [key]);
    return row?.value ?? null;
  } catch {
    return null;
  }
}

async function setMeta(key: string, value: string) {
  await db.none(
    `INSERT INTO app_meta(key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value],
  );
}

/**
 * Core Sync Logic (New Version)
 * - Full Scan (Daily): checks all pages, marks missing jobs as inactive.
 * - Incremental Scan (Hourly): stops when it sees a job posted before the last scan.
 */
export async function syncJobs() {
  await initializeDatabase();
  console.log("[Sync] Starting...");

  const now = new Date();
  const lastFullScanStr = await getMeta("last_full_scan");

  // Rule: Full scan if first sync of the day (UTC) or no previous full scan.
  // This ensures "active today" is properly defined by touching all jobs at least once per day.
  const todayUtc = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const lastFullScanDate = lastFullScanStr ? new Date(lastFullScanStr).toISOString().slice(0, 10) : null;
  const isFullScan = !lastFullScanDate || lastFullScanDate !== todayUtc;
  const fetchMode = isFullScan ? "FULL" : "INCREMENTAL";

  console.log(`[Sync] Mode: ${fetchMode}`);

  let page = 1;
  let stop = false;
  let processedCount = 0;
  let newCount = 0;

  // Pre-load tags to cache
  const tagMap = new Map<string, number>();
  const existingTags = await db.any("SELECT id, category, name FROM tags");
  existingTags.forEach((t: any) => tagMap.set(`${t.category}:${t.name}`, t.id));

  const getTagId = async (category: string, name: string) => {
    const key = `${category}:${name}`;
    if (tagMap.has(key)) return tagMap.get(key);
    const r = await db.one(
      "INSERT INTO tags(category, name) VALUES($1, $2) ON CONFLICT(category, name) DO UPDATE SET name=EXCLUDED.name RETURNING id",
      [category, name],
    );
    tagMap.set(key, r.id);
    return r.id;
  };

  // Track slugs seen in this run for Full Scan cleanup
  const seenSlugs = new Set<string>();

  while (!stop) {
    const url = `https://duunitori.fi/api/v1/jobentries?format=json&page=${page}&search=Tieto-+ja+tietoliikennetekniikka%28ala%29`;
    console.log(`[Sync] Fetching ${url}`);

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) break;
    const json: ResponseData = await response.json();

    if (!json.results || json.results.length === 0) break;

    for (const item of json.results) {
      seenSlugs.add(item.slug);

      // Determine if we should stop (Incremental mode only)
      const datePosted = item.date_posted;
      const existing = await db.oneOrNone("SELECT id, last_seen_at FROM jobs WHERE slug = $1", [item.slug]);

      if (existing) {
        // Update timestamp
        await db.none("UPDATE jobs SET last_seen_at = NOW(), active = TRUE WHERE id = $1", [existing.id]);

        // Stop if we hit old data in incremental mode
        if (fetchMode === "INCREMENTAL" && lastFullScanStr) {
          const itemDate = new Date(datePosted);
          const cutoff = new Date(new Date(lastFullScanStr).getTime() - 48 * 60 * 60 * 1000); // 48h buffer
          if (itemDate < cutoff) {
            // We can stop fetching pages, but finish current page
            stop = true;
          }
        }
      } else {
        newCount++;
        const analysis = await classifyJob(item.heading, item.descr, item.municipality_name);
        // Use OpenAI for work mode classification (fallback to heuristic if failure)
        let workMode = analysis.workMode;
        try {
          workMode = (await getWorkingMode(item.descr || "", item.heading || "")) || workMode;
        } catch (e) {
          console.warn(
            `[Sync] OpenAI work mode failed for slug=${item.slug}, fallback to heuristic:`,
            (e as Error).message,
          );
        }
        const jobRow = await db.one(
          `INSERT INTO jobs (
            slug, heading, descr, company_name, municipality_name, date_posted, last_seen_at,
            work_mode, seniority, salary_min, salary_max, salary_currency, active
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11, TRUE)
           RETURNING id`,
          [
            item.slug,
            item.heading,
            item.descr,
            item.company_name,
            item.municipality_name,
            datePosted,
            workMode,
            analysis.seniority,
            analysis.salary?.min || null,
            analysis.salary?.max || null,
            analysis.salary?.currency || null,
          ],
        );
        for (const t of analysis.tags) {
          const tId = await getTagId(t.category, t.name);
          await db.none("INSERT INTO job_tags(job_id, tag_id) VALUES($1, $2) ON CONFLICT DO NOTHING", [jobRow.id, tId]);
        }
      }
      processedCount++;
    }

    if (!json.next) break;
    page++;
  }

  // Cleanup: Mark jobs not seen in Full Scan as inactive
  if (fetchMode === "FULL") {
    await db.none("UPDATE jobs SET active = FALSE WHERE last_seen_at < NOW() - INTERVAL '2 hours'");
    await setMeta("last_full_scan", now.toISOString());
  }

  console.log(`[Sync] Done. Processed: ${processedCount}, New: ${newCount}`);
  await refreshStats();

  if (newCount > 0) {
    try {
      await notifySubscribers(db);
    } catch (e) {
      console.error("[Sync] Failed to notify subscribers:", (e as Error).message);
    }
  }
}

async function refreshStats() {
  // Pre-calculate daily stats for the V2 API
  await db.tx(async (t: any) => {
    await t.none("TRUNCATE TABLE daily_stats");
    // Aggregate active jobs by date and tag
    await t.none(`
      INSERT INTO daily_stats (date, tag_id, count)
      SELECT j.date_posted::date, jt.tag_id, COUNT(*)
      FROM jobs j
             JOIN job_tags jt ON j.id = jt.job_id
      WHERE j.active = TRUE
      GROUP BY j.date_posted::date, jt.tag_id
    `);
  });
}

// --- Re-Classification Logic ---

/**
 * Recalculates keywords/tags for all jobs (active and inactive).
 * @param options.updateWorkMode - If true, overwrites DB work_mode for all jobs.
 * If false, only fills work_mode where it is currently NULL (never set).
 */
export async function reclassifyJobs(options: { updateWorkMode?: boolean } = {}) {
  const { updateWorkMode = false } = options;
  await initializeDatabase();
  console.log(`[Admin] Re-classifying all jobs (updateWorkMode=${updateWorkMode})...`);

  // Fetch all jobs including inactive and current work_mode value
  const jobs = await db.any("SELECT id, heading, descr, municipality_name, work_mode FROM jobs");

  // Pre-load tags to reduce DB hits
  const tagMap = new Map<string, number>();
  const existingTags = await db.any("SELECT id, category, name FROM tags");
  existingTags.forEach((t: any) => tagMap.set(`${t.category}:${t.name}`, t.id));

  const getTagId = async (category: string, name: string) => {
    const key = `${category}:${name}`;
    if (tagMap.has(key)) return tagMap.get(key);
    const r = await db.one(
      "INSERT INTO tags(category, name) VALUES($1, $2) ON CONFLICT(category, name) DO UPDATE SET name=EXCLUDED.name RETURNING id",
      [category, name],
    );
    tagMap.set(key, r.id);
    return r.id;
  };

  let updatedWorkModeCount = 0;

  for (const job of jobs) {
    const analysis = await classifyJob(job.heading || "", job.descr || "", job.municipality_name || "");
    const shouldUpdateWorkMode = updateWorkMode || job.work_mode == null;
    let newWorkMode: string | null = null;
    if (shouldUpdateWorkMode) {
      try {
        newWorkMode = (await getWorkingMode(job.descr || "", job.heading || "")) || analysis.workMode;
      } catch (e) {
        console.warn(
          `[Reclassify] OpenAI work mode failed for job id=${job.id}, fallback to heuristic:`,
          (e as Error).message,
        );
        newWorkMode = analysis.workMode;
      }
    }
    if (shouldUpdateWorkMode) {
      await db.none("UPDATE jobs SET work_mode = $1, seniority = $2, salary_min = $3, salary_max = $4 WHERE id = $5", [
        newWorkMode,
        analysis.seniority,
        analysis.salary?.min,
        analysis.salary?.max,
        job.id,
      ]);
      updatedWorkModeCount++;
    } else {
      await db.none("UPDATE jobs SET seniority = $1, salary_min = $2, salary_max = $3 WHERE id = $4", [
        analysis.seniority,
        analysis.salary?.min,
        analysis.salary?.max,
        job.id,
      ]);
    }

    // 2. Update Tags (Full replacement for accuracy based on new keywords)
    await db.none("DELETE FROM job_tags WHERE job_id = $1", [job.id]);
    for (const t of analysis.tags) {
      const tId = await getTagId(t.category, t.name);
      await db.none("INSERT INTO job_tags(job_id, tag_id) VALUES($1, $2) ON CONFLICT DO NOTHING", [job.id, tId]);
    }
  }

  await refreshStats();
  console.log(`[Admin] Re-classification complete. Work mode updated for ${updatedWorkModeCount} jobs.`);
}

// --- Compatibility Exports ---

// Replaces old implementation with new robust sync
export async function syncDataIfNeeded() {
  return syncJobs();
}

// For backward compatibility with API route
export async function runWorkModeBackfill() {
  // Default: Don't overwrite work_mode (safe default), effectively just refreshing tags/stats
  return reclassifyJobs({ updateWorkMode: false });
}

// Keeps API V1 working by returning the raw job rows
export async function fetchDatabaseData() {
  await initializeDatabase();
  // Return all data V1 needs.
  return await db.any(
    "SELECT id, slug, heading, descr, company_name, municipality_name, date_posted, last_seen_at, work_mode FROM jobs",
  );
}
