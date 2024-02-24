import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { ResponseData, Results } from "@/types";
import crypto from "crypto";
import { NextResponse } from "next/server";

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

async function initializeDatabase() {
  // Connect to SQLite database
  const db = await open({
    filename: "./jobs.db",
    driver: sqlite3.Database,
  });

  // Create table if it doesn't exist
  await db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE,
      heading TEXT,
      descr TEXT,
      company_name TEXT,
      municipality_name TEXT
      date_posted TEXT
    )
  `);
}

async function fetchDataFromApi() {
  let apiUrl =
    "https://duunitori.fi/api/v1/jobentries?format=json&page=1&search=Tieto-+ja+tietoliikennetekniikka%28ala%29";
  let newData: Results[] = [];
  let duplicates: number = 0;

  // Loop to fetch all pages of data from the API
  while (true) {
    console.log(`Fetching ${apiUrl}`);
    const response = await fetch(apiUrl);
    const newPageData: ResponseData = await response.json();

    // Loop through each job and add new jobs to the new data
    for (const job of newPageData.results) {
      if (await jobAlreadyInData(job)) {
        duplicates++;
      } else {
        newData.push(job);
      }
    }

    // If there are no more pages, break the loop
    if (!newPageData.next) break;
    // If there are more than 10 duplicates, break the loop
    if (duplicates > 10) break;
    // Set the next API URL to fetch
    apiUrl = newPageData.next;
  }

  console.log(`Fetched ${newData.length} new jobs, ${duplicates} duplicates`);

  return newData;
}

async function insertNewJobData(data: Results[]) {
  const db = await open({
    filename: "./jobs.db",
    driver: sqlite3.Database,
  });

  for (const job of data) {
    try {
      await db.run(
        "INSERT INTO jobs (slug, heading, descr, company_name, municipality_name, date_posted) VALUES (?, ?, ?, ?, ?, ?)",
        job.slug,
        job.heading,
        job.descr,
        job.company_name,
        job.municipality_name,
        job.date_posted
      );
    } catch (e) {
      console.log("Error inserting job data", e);
    }
  }
}

async function fetchDatabaseData() {
  try {
    const db = await open({
      filename: "./jobs.db",
      driver: sqlite3.Database,
    });
    // Fetch existing job data from the database
    return await db.all("SELECT * FROM jobs");
  } catch (e) {
    console.log("Error opening database", e);
    await initializeDatabase();
    const db = await open({
      filename: "./jobs.db",
      driver: sqlite3.Database,
    });
    // Fetch existing job data from the database
    return await db.all("SELECT * FROM jobs");
  }
}

export async function GET() {
  data = [];
  // Fetch existing job data from the database
  const existingJobData = await fetchDatabaseData();

  // Concatenate the existing job data with the data
  data = existingJobData.concat(data);

  // Fetch new job data from the API
  const newJobData = await fetchDataFromApi();

  // Add new job data to the db
  await insertNewJobData(newJobData);

  // Concatenate the new job data with the data
  data = newJobData.concat(data);

  // Return the job data
  const returnData: ResponseData = {
    count: data.length,
    next: null,
    previous: null,
    results: data,
  };

  console.log(`Returning ${returnData.count} jobs`);
  return NextResponse.json({ data: returnData });
}
