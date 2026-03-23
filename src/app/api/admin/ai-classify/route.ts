import { NextResponse } from "next/server";
import { classifyJobWithAI, flattenAiResult } from "@/lib/gemini";
import { initializeDatabase } from "@/lib/data-sync";
import pgPromise from "pg-promise";

const pgp = pgPromise();
const g = globalThis as any;
const db = g.__db || pgp(process.env.POSTGRES_URL || "");
if (!g.__db) g.__db = db;

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const jobId = body.jobId;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    await initializeDatabase();

    const job = await db.oneOrNone("SELECT id, heading, descr, ai_classified_at FROM jobs WHERE id = $1", [jobId]);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.ai_classified_at) {
      return NextResponse.json({ error: "Job already AI-classified", ai_classified_at: job.ai_classified_at }, { status: 409 });
    }

    const aiResult = await classifyJobWithAI(job.heading || "", job.descr || "");
    const rows = flattenAiResult(aiResult);

    await db.tx(async (t: any) => {
      // Clear any existing AI tags for this job (safety)
      await t.none("DELETE FROM ai_job_tags WHERE job_id = $1", [jobId]);

      // Insert AI tags
      for (const row of rows) {
        await t.none(
          "INSERT INTO ai_job_tags (job_id, category, keyword, origin) VALUES ($1, $2, $3, $4)",
          [jobId, row.category, row.keyword, row.origin],
        );
      }

      // Mark job as AI-classified
      await t.none("UPDATE jobs SET ai_classified_at = NOW() WHERE id = $1", [jobId]);
    });

    return NextResponse.json({
      ok: true,
      jobId,
      tagCount: rows.length,
      categories: aiResult,
    });
  } catch (e: any) {
    console.error("AI classify failed", e);
    return NextResponse.json({ error: e.message || "AI classify failed" }, { status: 500 });
  }
}
