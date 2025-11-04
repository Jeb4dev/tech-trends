import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getBaseStats } from "@/lib/api-helpers";

// Cache the route output for all users; refresh roughly twice a day
export const dynamic = 'force-static';
export const revalidate = 21600; // 6 hours

const getCachedBase = unstable_cache(
  async () => {
    return await getBaseStats();
  },
  ['api/v1/base'],
  { revalidate: 21600, tags: ['api-v1-base'] }
);

export async function GET() {
  const base = await getCachedBase();
  return NextResponse.json(base, {
    headers: {
      // Shared cache for 6h; allow long stale-while-revalidate for better UX
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
    },
  });
}

