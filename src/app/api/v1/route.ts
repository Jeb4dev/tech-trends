import { IMain, IDatabase } from "pg-promise";
import pgPromise from "pg-promise";
import { ResponseData, Results } from "@/types";
import { NextResponse } from "next/server";
import { computeBaseSlim } from "@/compute";

// Ensure this Route Handler is always dynamic and never statically cached
export const dynamic = 'force-dynamic';
export const revalidate = 0; // no ISR

const pgp: IMain = pgPromise();
// @ts-ignore
const db: IDatabase<any> = pgp(process.env.POSTGRES_URL);

const REFRESH_INTERVAL_HOURS = 6; // Fetch a few times a day

// In-memory cache for API response with precomputed aggregates
let cachedResponse: any | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in-memory cache to avoid recomputing

async function initializeDatabase() {
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
        last_seen_at TIMESTAMPTZ
      )
    `);
    // Ensure new column exists if table was created earlier without it
    await t.none(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ`);

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
    // Explicitly disable Next.js fetch cache so new data can be pulled during runtime requests
    const response = await fetch(apiUrl, { cache: 'no-store', next: { revalidate: 0 } });
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
  // Renamed semantic: upsert all jobs (new + existing) to refresh last_seen_at
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

async function fetchDatabaseData() {
  try {
    // Fetch existing job data from the database
    return await db.any("SELECT * FROM jobs");
  } catch (e) {
    console.log("Error opening database", e);
    await initializeDatabase();
    // Fetch existing job data from the database
    return await db.any("SELECT * FROM jobs");
  }
}

async function buildResponseFromJobs(jobs: Results[]) {
  // Precompute aggregates once here
  const base = computeBaseSlim(jobs);
  // Remove internal cached fields before sending
  const results: Results[] = jobs.map((j) => ({
    heading: j.heading,
    date_posted: j.date_posted,
    slug: j.slug,
    municipality_name: j.municipality_name,
    export_image_url: j.export_image_url,
    company_name: j.company_name,
    descr: j.descr,
    latitude: j.latitude,
    longitude: j.longitude,
    last_seen_at: j.last_seen_at,
  }));
  const returnData: ResponseData = {
    count: results.length,
    next: null,
    previous: null,
    results,
  };
  return { data: returnData, base };
}

async function refreshInBackground() {
  try {
    const existingJobData = await fetchDatabaseData();
    const { jobs: activeJobs } = await fetchDataFromApi(new Set(existingJobData.map((j: any) => j.slug)));
    await insertNewJobData(activeJobs);
    await setMeta("last_fetch_at", new Date().toISOString());
  } catch (e) {
    console.error("Background refresh failed", e);
  }
}

async function getFreshResponse(forceRefresh = false) {
  await initializeDatabase();

  // Use an in-memory cache for the full response
  const now = Date.now();
  if (!forceRefresh && cachedResponse && now - cachedAt < CACHE_TTL_MS) {
    return cachedResponse;
  }

  const lastFetch = await getMeta("last_fetch_at");
  const shouldRefresh = needsRefresh(lastFetch);
  console.log(`Last fetch at: ${lastFetch} -> refresh needed: ${shouldRefresh}`);

  // Load current DB snapshot (includes historical jobs)
  const existingJobData = await fetchDatabaseData();

  if (shouldRefresh) {
    // Serve current snapshot immediately and refresh in background
    const immediate = await buildResponseFromJobs(existingJobData as any);
    cachedResponse = immediate;
    cachedAt = now;
    // Fire and forget refresh to update DB for next requests
    refreshInBackground()
      .then(async () => {
        try {
          const latest = await fetchDatabaseData();
          cachedResponse = await buildResponseFromJobs(latest as any);
          cachedAt = Date.now();
        } catch (e) {
          console.error("Post-refresh snapshot compute failed", e);
        }
      })
      .catch((e) => console.error("Refresh scheduling failed", e));
    return immediate;
  } else {
    const resp = await buildResponseFromJobs(existingJobData as any);
    cachedResponse = resp;
    cachedAt = now;
    return resp;
  }
}

export async function GET() {
  const response = await getFreshResponse(false);
  return NextResponse.json(response, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' } });
}
