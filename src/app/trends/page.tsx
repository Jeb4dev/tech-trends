import { Suspense } from 'react';
import { ResponseData } from '@/types';
import { buildBaseCategories } from '@/lib/buildCategories';
import TrendsClient from './TrendsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export default async function TrendsPage({ searchParams }: any) {
  const sp = searchParams || {};
  const base = getBaseUrl();
  let data: ResponseData | null = null;
  try {
    const res = await fetch(`${base}/api/v1`, { cache: 'no-store', next: { revalidate: 0 } });
    if (!res.ok) {
      return <div className="px-6 py-10 text-red-400">Failed to load data (status {res.status}).</div>;
    }
    const json = await res.json();
    data = json.data as ResponseData;
  } catch (e: any) {
    return <div className="px-6 py-10 text-red-400">Server fetch error: {e?.message || 'unknown'}</div>;
  }
  const baseCats = buildBaseCategories(data.results);
  return (
    <Suspense fallback={<div className="px-8 sm:px-0">Loading...</div>}>
      <TrendsClient initialData={data} initialBase={baseCats} searchParams={sp as Record<string, string | string[]>} />
    </Suspense>
  );
}
