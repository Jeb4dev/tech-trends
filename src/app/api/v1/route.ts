import { IMain, IDatabase } from "pg-promise";
import pgPromise from "pg-promise";
import { ResponseData, Results } from "@/types";
import crypto from "crypto";
import { NextResponse } from "next/server";

// Ensure this Route Handler is always dynamic and never statically cached
export const dynamic = 'force-dynamic';
export const revalidate = 0; // no ISR

const useDb = !!process.env.POSTGRES_URL;
const pgp: IMain = pgPromise();
// @ts-ignore
const db: IDatabase<any> | null = useDb ? pgp(process.env.POSTGRES_URL) : null;

// In-memory fallback when database is not available
let inMemoryData: Results[] = [];
let inMemoryLastFetch: string | null = null;

let data: Results[] = [];
function hashData(data: Results) {
  // Create a hash of the data
  const item = JSON.stringify({
    slug: data.slug,
    heading: data.heading,
    descr: data.descr,
    company_name: data.company_name,
    municipality_name: data.municipality_name,
  });

  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify(item));
  return hash.digest("hex");
}

// Removed jobAlreadyInData usage in refresh logic (still kept if needed elsewhere)
async function jobAlreadyInData(newJob: Results) {
  // Check if the job already exists in the data, return boolean
  const hash = hashData(newJob);
  return !!data.find((job) => hashData(job) === hash);
}

const REFRESH_INTERVAL_HOURS = 6; // Fetch a few times a day

async function initializeDatabase() {
  if (!useDb) return; // skip if no DB
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
  if (!useDb) {
    if (key === "last_fetch_at") return inMemoryLastFetch;
    return null;
  }
  try {
    const row = await db.oneOrNone(`SELECT value FROM app_meta WHERE key = $1`, [key]);
    return row?.value ?? null;
  } catch {
    return null;
  }
}

async function setMeta(key: string, value: string) {
  if (!useDb) {
    if (key === "last_fetch_at") inMemoryLastFetch = value;
    return;
  }
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
  if (!useDb) return inMemoryData; // fallback straight to memory
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
export async function GET() {
  data = [];
  await initializeDatabase();

  const lastFetch = await getMeta("last_fetch_at");
  const shouldRefresh = needsRefresh(lastFetch);
  console.log(`Last fetch at: ${lastFetch} -> refresh needed: ${shouldRefresh} (db=${useDb})`);

  // Load current snapshot
  const existingJobData = await fetchDatabaseData();
  const existingSlugs = new Set(existingJobData.map((j: any) => j.slug));

  if (shouldRefresh) {
    const { jobs: activeJobs } = await fetchDataFromApi(existingSlugs);
    if (useDb) {
      await insertNewJobData(activeJobs);
    } else {
      // in-memory upsert
      const activeSlugSet = new Set(activeJobs.map(j => j.slug));
      const inactive = existingJobData.filter((j: any) => !activeSlugSet.has(j.slug));
      inMemoryData = activeJobs.concat(inactive);
    }
    await setMeta("last_fetch_at", new Date().toISOString());

    if (useDb) {
      const activeSlugSet = new Set(activeJobs.map(j => j.slug));
      const inactiveJobs = (existingJobData as any[]).filter(j => !activeSlugSet.has(j.slug));
      data = activeJobs.concat(inactiveJobs);
    } else {
      data = inMemoryData;
    }
  } else {
    data = existingJobData as any[];
  }

  const returnData: ResponseData = {
    count: data.length,
    next: null,
    previous: null,
    results: data,
  };

  return NextResponse.json({ data: returnData });
}
