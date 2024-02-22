import { ResponseData } from "@/types";
import { NextResponse } from "next/server";
import { put, del, list } from "@vercel/blob";
import crypto from "crypto";

// Variables to store the fetched data and the time of the fetch
let fetchedData: ResponseData;
let fetchTime = new Date().getTime();

// Function to create a hash of the data
function hashData(data: object) {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify(data));
  return hash.digest("hex");
}

// Function to fetch data from the API
async function fetchJobData() {
  let apiUrl = "https://duunitori.fi/api/v1/jobentries?format=json&search=Tieto-+ja+tietoliikennetekniikka%28ala%29";

  // Loop to fetch all pages of data from the API
  while (true) {
    console.log(`Fetching ${apiUrl}`);
    const apiResponse = await fetch(apiUrl);
    const newPageData: ResponseData = await apiResponse.json();

    // If the current record already exists in the fetchedData.results array, break the loop
    if (fetchedData && fetchedData.results.some((result) => hashData(result) === hashData(newPageData.results[0]))) {
      break;
    }
    if (!newPageData.next) break;
    fetchedData =
      fetchedData != null
        ? { ...fetchedData, results: fetchedData.results.concat(newPageData.results), next: newPageData.next }
        : newPageData;
    apiUrl = newPageData.next;
  }

  // Store the time of the fetch
  fetchTime = new Date().getTime();

  // Store the fetched data in the blob storage
  const jobs = await put("jobs/data.json", JSON.stringify(fetchedData), { access: "public" });
  console.log(jobs);
}

// Serverless function to handle GET requests
export async function GET() {
  const blobsData = await list();
  const newestData = blobsData.blobs.find(
    (blob) => blob.uploadedAt === blobsData.blobs.reduce((a, b) => (a.uploadedAt > b.uploadedAt ? a : b)).uploadedAt
  );
  let fetchTime = new Date().getTime();

  // delete old data
  // for (const blob of blobsData.blobs) {
  //   if (new Date().getTime() - blob.uploadedAt.getTime() > 400000) {
  //     console.log(`Deleting old data: ${blob.url}`);
  //     await del(blob.url);
  //   }
  // }

  if (newestData) {
    console.log("Fetching data from the blob storage");
    fetchedData = JSON.parse(await fetch(newestData.url).then((res) => res.text()));
    fetchTime = newestData.uploadedAt.getTime();
    // If newest data is older than 5 minutes, fetch new data
    if (new Date().getTime() - fetchTime > 300000) {
      console.log("Fetching new data");
      await fetchJobData();
    }
    else {
      console.log("Using cached data");
    }
  }
  else {
    console.log("Fetching new data");
    await fetchJobData();
  }

  // Return the fetched data
  return NextResponse.json({ data: fetchedData });
}
