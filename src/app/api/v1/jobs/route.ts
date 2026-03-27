import { NextResponse } from "next/server";
import { getJobsData } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = await getJobsData();
  return NextResponse.json(jobs, {
    headers: {
      // Shared cache for 6h; allow long stale-while-revalidate for better UX
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
    },
  });
}
