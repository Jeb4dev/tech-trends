import { ResponseData, Results } from "@/types";
import { computeBaseSlim } from "@/compute";
import { fetchDatabaseData } from "@/lib/data-sync";

export async function getJobsData(): Promise<ResponseData> {
  const existingJobData = await fetchDatabaseData();

  // Remove internal cached fields before sending (compact payload)
  const results: Results[] = existingJobData.map((j: any) => ({
    id: j.id,
    heading: j.heading,
    date_posted: j.date_posted,
    slug: j.slug,
    municipality_name: j.municipality_name,
    company_name: j.company_name,
    descr: j.descr,
    last_seen_at: j.last_seen_at,
    work_mode: j.work_mode,
  }));

  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  };
}

export async function getBaseStats() {
  const existingJobData = await fetchDatabaseData();
  return computeBaseSlim(existingJobData as any);
}
