// src/instrumentation.ts
// Server startup hook: run background data sync periodically without cron
import 'server-only'

import { syncDataIfNeeded } from '@/lib/data-sync'

let started = false
let timer: NodeJS.Timer | null = null

async function safeSync(reason: string) {
  try {
    console.log(`[instrumentation] background sync start: ${reason}`)
    await syncDataIfNeeded()
    console.log('[instrumentation] background sync done')
  } catch (err) {
    console.error('[instrumentation] background sync error', err)
  }
}

export async function register() {
  if (started) return
  started = true

  // Optional kill switch
  if (process.env.DISABLE_BACKGROUND_SYNC === '1') {
    console.warn('[instrumentation] background sync disabled via env')
    return
  }

  // Kick off one sync on boot (non-blocking)
  void safeSync('startup')

  // Then schedule periodic checks (hourly). The sync function itself
  // will decide whether a refresh is needed based on last fetch timestamp.
  const hourMs = 60 * 60 * 1000
  const jitter = Math.floor(Math.random() * 10 * 60 * 1000) // up to 10 min jitter to avoid thundering herd

  timer = setTimeout(() => {
    // First delayed run
    void safeSync('first-interval')
    timer = setInterval(() => void safeSync('interval'), hourMs)
  }, jitter) as unknown as NodeJS.Timer

  // Clean up on shutdown
  const cleanup = () => {
    if (timer) {
      try { clearInterval(timer) } catch {}
      timer = null
    }
  }
  process.on('SIGTERM', cleanup)
  process.on('SIGINT', cleanup)
}

