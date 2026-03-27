import { NextResponse } from "next/server";
import { getJobsData, getBaseStats } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// Backward compatibility: returns both data and base
export async function GET() {
  const [data, base] = await Promise.all([getJobsData(), getBaseStats()]);
  const response = { data, base };
  return NextResponse.json(response, {
    headers: {
      // Shared cache for 6h; allow long stale-while-revalidate for better UX
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
    },
  });
}
