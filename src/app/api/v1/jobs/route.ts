import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getJobsData } from "@/lib/api-helpers";

// Cache the route output for all users; refresh roughly twice a day
export const dynamic = 'force-static';
export const revalidate = 21600; // 6 hours

const getCachedJobs = unstable_cache(
  async () => {
    return await getJobsData();
  },
  ['api/v1/jobs'],
  { revalidate: 21600, tags: ['api-v1-jobs'] }
);

export async function GET() {
  const jobs = await getCachedJobs();
  return NextResponse.json(jobs, {
    headers: {
      // Shared cache for 6h; allow long stale-while-revalidate for better UX
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
    },
  });
}

