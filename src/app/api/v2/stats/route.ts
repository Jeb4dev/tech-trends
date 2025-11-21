import { NextResponse } from 'next/server';
import pgPromise from 'pg-promise';

const pgp = pgPromise();
const db = (globalThis as any).__db || pgp(process.env.POSTGRES_URL || '');

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache CDN side for 1 hour

export async function GET() {
  try {
    // Return aggregated counts for the last 90 days
    const totals = await db.any(`
      SELECT t.category, t.name, SUM(ds.count) as total
      FROM daily_stats ds
             JOIN tags t ON ds.tag_id = t.id
      WHERE ds.date > NOW() - INTERVAL '90 days'
      GROUP BY t.category, t.name
      ORDER BY total DESC
    `);

    // Group by category
    const categories: Record<string, any[]> = {};
    totals.forEach((row: any) => {
      if (!categories[row.category]) categories[row.category] = [];
      categories[row.category].push({
        label: row.name,
        count: parseInt(row.total, 10)
      });
    });

    return NextResponse.json({ categories });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Stats failed' }, { status: 500 });
  }
}