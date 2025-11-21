import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getJobsData, getBaseStats } from "@/lib/api-helpers";

// Cache the route output for all users; refresh roughly twice a day
export const dynamic = "force-static";
export const revalidate = 21600; // 6 hours

// Backward compatibility: returns both data and base
const getCachedResponse = unstable_cache(
  async () => {
    const [data, base] = await Promise.all([getJobsData(), getBaseStats()]);
    return { data, base };
  },
  ["api/v1"],
  { revalidate: 21600, tags: ["api-v1"] },
);

export async function GET() {
  const response = await getCachedResponse();
  return NextResponse.json(response, {
    headers: {
      // Shared cache for 6h; allow long stale-while-revalidate for better UX
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
    },
  });
}
