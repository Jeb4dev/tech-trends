import { NextResponse } from 'next/server'
import { runWorkModeBackfill } from '@/lib/data-sync'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = request.headers.get('authorization') || ''
  const token = process.env.BACKFILL_TOKEN
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await runWorkModeBackfill()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Backfill failed', e)
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500 })
  }
}

