// src/instrumentation.ts
// Server startup hook: run background data sync periodically without cron
import "server-only";

import { syncDataIfNeeded } from "@/lib/data-sync";

let started = false;
let timer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval> | null = null;

async function safeSync(reason: string) {
  try {
    console.log(`[instrumentation] background sync start: ${reason}`);
    await syncDataIfNeeded();
    console.log("[instrumentation] background sync done");
  } catch (err) {
    console.error("[instrumentation] background sync error", err);
  }
}

export async function register() {
  if (started) return;
  started = true;

  // Optional kill switch
  if (process.env.DISABLE_BACKGROUND_SYNC === "1") {
    console.warn("[instrumentation] background sync disabled via env");
    return;
  }

  // Delay the first sync so the server is fully ready before the CPU spike
  const hourMs = 60 * 60 * 1000;
  const startupDelay = 15_000; // 15 seconds
  const jitter = Math.floor(Math.random() * 10 * 60 * 1000); // up to 10 min jitter to avoid thundering herd

  timer = setTimeout(() => {
    void safeSync("startup");
    timer = setTimeout(() => {
      // First interval run after jitter, then hourly
      void safeSync("first-interval");
      timer = setInterval(() => void safeSync("interval"), hourMs);
    }, jitter);
  }, startupDelay);

  // Clean up on shutdown
  const cleanup = () => {
    if (timer) {
      try {
        clearInterval(timer);
      } catch {}
      timer = null;
    }
  };
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("SIGTERM", cleanup);
    process.on("SIGINT", cleanup);
  }
}
