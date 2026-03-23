import { NextResponse } from "next/server";
import pgPromise from "pg-promise";

const pgp = pgPromise();
const g = globalThis as any;
const db = g.__db || pgp(process.env.POSTGRES_URL || "");
if (!g.__db) g.__db = db;

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = parseInt(id, 10);
  if (isNaN(jobId)) {
    return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
  }

  try {
    const job = await db.oneOrNone(
      "SELECT id, heading, company_name, ai_classified_at FROM jobs WHERE id = $1",
      [jobId],
    );
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Get manual/heuristic tags (from job_tags + tags tables)
    const manualTags = await db.any(
      `SELECT t.category, t.name as keyword
       FROM job_tags jt
       JOIN tags t ON jt.tag_id = t.id
       WHERE jt.job_id = $1
       ORDER BY t.category, t.name`,
      [jobId],
    );

    // Get AI tags
    const aiTags = await db.any(
      `SELECT category, keyword, origin
       FROM ai_job_tags
       WHERE job_id = $1
       ORDER BY category, keyword`,
      [jobId],
    );

    // Get job-level fields for comparison (seniority, work_mode)
    const jobDetails = await db.oneOrNone(
      "SELECT seniority, work_mode FROM jobs WHERE id = $1",
      [jobId],
    );

    return NextResponse.json({
      jobId,
      heading: job.heading,
      company_name: job.company_name,
      ai_classified_at: job.ai_classified_at,
      manual: {
        tags: manualTags,
        seniority: jobDetails?.seniority || null,
        workMode: jobDetails?.work_mode || null,
      },
      ai: {
        tags: aiTags,
      },
    });
  } catch (e: any) {
    console.error("Failed to fetch AI tags", e);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}
