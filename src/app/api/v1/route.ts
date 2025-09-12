import { IMain, IDatabase } from "pg-promise";
import pgPromise from "pg-promise";
import { ResponseData, Results } from "@/types";
import crypto from "crypto";
import { NextResponse } from "next/server";

const pgp: IMain = pgPromise();
// @ts-ignore
const db: IDatabase<any> = pgp(process.env.POSTGRES_URL);

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

async function jobAlreadyInData(newJob: Results) {
  // Check if the job already exists in the data, return boolean
  const hash = hashData(newJob);
  return !!data.find((job) => hashData(job) === hash);
}

const REFRESH_INTERVAL_HOURS = 6; // Fetch a few times a day

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

async function fetchDataFromApi() {
  let apiUrl =
    "https://duunitori.fi/api/v1/jobentries?format=json&page=1&search=Tieto-+ja+tietoliikennetekniikka%28ala%29";
  let newData: Results[] = [];
  let duplicates: number = 0;
  const seenAt = new Date().toISOString();
  // Loop to fetch all pages of data from the API
  while (true) {
    console.log(`Fetching ${apiUrl}`);
    const response = await fetch(apiUrl);
    const newPageData: ResponseData = await response.json();

    for (const job of newPageData.results) {
      // enrich with last_seen_at timestamp
      job.last_seen_at = seenAt;
      if (await jobAlreadyInData(job)) {
        duplicates++;
      } else {
        newData.push(job);
      }
    }

    if (!newPageData.next) break;
    if (duplicates > 10) break;
    apiUrl = newPageData.next;
  }
  console.log(`Fetched ${newData.length} new jobs, ${duplicates} duplicates`);
  return newData;
}

async function insertNewJobData(data: Results[]) {
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
  console.log(`Upserted ${data.length} jobs into the database`);
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
export async function GET() {
  data = [];
  await initializeDatabase();

  const lastFetch = await getMeta("last_fetch_at");
  const shouldRefresh = needsRefresh(lastFetch);
  console.log(`Last fetch at: ${lastFetch} -> refresh needed: ${shouldRefresh}`);

  // Always fetch current DB first
  const existingJobData = await fetchDatabaseData();
  data = existingJobData.concat(data);

  if (shouldRefresh) {
    const newJobData = await fetchDataFromApi();
    await insertNewJobData(newJobData);
    await setMeta("last_fetch_at", new Date().toISOString());
    // Merge new data to the front
    data = newJobData.concat(data);
  }

  const returnData: ResponseData = {
    count: data.length,
    next: null,
    previous: null,
    results: data,
  };

  console.log(`Returning ${returnData.count} jobs (refreshed=${shouldRefresh})`);
  return NextResponse.json({ data: returnData });
}
