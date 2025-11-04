import { IMain, IDatabase } from "pg-promise";
import pgPromise from "pg-promise";
import { ResponseData, Results } from "@/types";
import { getWorkingMode } from "@/lib/openai";

const pgp: IMain = pgPromise();
// @ts-ignore
const db: IDatabase<any> = pgp(process.env.POSTGRES_URL);

const REFRESH_INTERVAL_HOURS = 6; // Fetch a few times a day

export async function initializeDatabase() {
  // Create tables if they don't exist
  await db.tx(async (t) => {
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
    // Ensure new column exists if table was created earlier without it
    await t.none(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ`);
    await t.none(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_mode TEXT`);

    await t.none(`
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT
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
    [key, value]
  );
}

function needsRefresh(lastFetchIso: string | null) {
  if (!lastFetchIso) return true;
  const last = new Date(lastFetchIso).getTime();
  if (isNaN(last)) return true;
  const ageHours = (Date.now() - last) / (1000 * 60 * 60);
  return ageHours >= REFRESH_INTERVAL_HOURS;
}

async function fetchDataFromApi(existingSlugs: Set<string>) {
  let apiUrl =
    "https://duunitori.fi/api/v1/jobentries?format=json&page=1&search=Tieto-+ja+tietoliikennetekniikka%28ala%29";
  const seenAt = new Date().toISOString();
  const allJobs: Results[] = [];
  let newCount = 0;
  let existingCount = 0;

  while (true) {
    console.log(`Fetching ${apiUrl}`);
    // Explicitly disable fetch cache so new data can be pulled during runtime requests
    const response = await fetch(apiUrl, { cache: 'no-store' });
    if (!response.ok) {
      console.error("Upstream fetch error", response.status, await response.text());
      break;
    }
    const newPageData: ResponseData = await response.json();

    for (const job of newPageData.results) {
      job.last_seen_at = seenAt; // set/update timestamp for every active posting
      if (existingSlugs.has(job.slug)) existingCount++; else newCount++;
      // lowercase cache once
      if (!job._headingLower) job._headingLower = job.heading.toLowerCase();
      if (!job._descrLower) job._descrLower = job.descr.toLowerCase();
      allJobs.push(job);
    }

    if (!newPageData.next) break;
    apiUrl = newPageData.next;
  }

  console.log(`Fetched pages: total active jobs=${allJobs.length} (new=${newCount}, existing=${existingCount})`);
  return { jobs: allJobs, stats: { new: newCount, existing: existingCount, seenAt } };
}

async function insertNewJobData(data: Results[]) {
  // Upsert all jobs (new + existing) to refresh last_seen_at
  for (const job of data) {
    try {
      await db.none(
        `INSERT INTO jobs (slug, heading, descr, company_name, municipality_name, date_posted, last_seen_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (slug) DO UPDATE SET
           heading = EXCLUDED.heading,
           descr = EXCLUDED.descr,
           company_name = EXCLUDED.company_name,
           municipality_name = EXCLUDED.municipality_name,
           date_posted = EXCLUDED.date_posted,
           last_seen_at = EXCLUDED.last_seen_at`,
        [
          job.slug,
          job.heading,
          job.descr,
          job.company_name,
          job.municipality_name,
          job.date_posted,
          job.last_seen_at || new Date().toISOString(),
        ]
      );
    } catch (e) {
      console.log("Error upserting job data", e);
    }
  }
  console.log(`Upserted (refreshed) ${data.length} active jobs`);
}

async function classifyMissingWorkModes() {
  // Skip if no OpenAI key configured
  if (!process.env.OPENAI_API_KEY) {
    console.warn('Skipping work_mode classification: OPENAI_API_KEY not set');
    return;
  }

  // Fetch jobs that are missing classification
  // noinspection SqlResolve
  const toClassify: { id: number; heading: string; descr: string }[] = await db.any(
    `SELECT id, heading, descr FROM jobs WHERE work_mode IS NULL`
  );

  if (!toClassify.length) {
    console.log('No jobs require work_mode classification');
    return;
  }

  console.log(`Classifying work_mode for ${toClassify.length} jobs`);

  // Process sequentially to stay within rate limits; could be optimized with small concurrency if needed
  for (const row of toClassify) {
    try {
      const mode = await getWorkingMode(row.descr || '', row.heading || '');
      // noinspection SqlResolve
      await db.none(`UPDATE jobs SET work_mode = $1 WHERE id = $2`, [mode, row.id]);
    } catch (err) {
      console.error(`Failed to classify work_mode for job id=${row.id}:`, err);
      // Don't throw; continue with others
    }
  }

  console.log('work_mode classification complete');
}

export async function fetchDatabaseData() {
  try {
    await initializeDatabase();
    // Fetch existing job data from the database
    // noinspection SqlResolve
    return await db.any("SELECT id, slug, heading, descr, company_name, municipality_name, date_posted, last_seen_at, work_mode FROM jobs");
  } catch (e) {
    console.log("Error opening database", e);
    await initializeDatabase();
    // Fetch existing job data from the database
    // noinspection SqlResolve
    return await db.any("SELECT id, slug, heading, descr, company_name, municipality_name, date_posted, last_seen_at, work_mode FROM jobs");
  }
}

export async function syncDataIfNeeded() {
  await initializeDatabase();

  const lastFetch = await getMeta("last_fetch_at");
  const shouldRefresh = needsRefresh(lastFetch);
  console.log(`Last fetch at: ${lastFetch} -> refresh needed: ${shouldRefresh}`);

  if (shouldRefresh) {
    try {
      const existingJobData = await fetchDatabaseData();
      const { jobs: activeJobs } = await fetchDataFromApi(new Set(existingJobData.map((j: any) => j.slug)));
      await insertNewJobData(activeJobs);
      // After refreshing active postings, classify any rows missing work_mode
      await classifyMissingWorkModes();
      await setMeta("last_fetch_at", new Date().toISOString());
      console.log("Data sync completed successfully");
    } catch (e) {
      console.error("Data sync failed", e);
      throw e;
    }
  } else {
    // No refresh; avoid classification here to keep request paths fast and build-time stable
  }
}

export async function runWorkModeBackfill() {
  await initializeDatabase();
  await classifyMissingWorkModes();
}
