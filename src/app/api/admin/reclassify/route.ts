import { NextResponse } from "next/server";
import { reclassifyJobs } from "@/lib/data-sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const token = process.env.BACKFILL_TOKEN;
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const updateWorkMode = !!body.updateWorkMode;

    // Run asynchronously to avoid timeout, or await if dataset is small
    // For safety in serverless/edge, await might timeout, but in standalone/docker it's fine.
    // We await here to ensure stats are refreshed before returning.
    await reclassifyJobs({ updateWorkMode });

    return NextResponse.json({ ok: true, message: "Re-classification complete" });
  } catch (e) {
    console.error("Reclassify failed", e);
    return NextResponse.json({ error: "Reclassify failed" }, { status: 500 });
  }
}
