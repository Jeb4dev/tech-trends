import { NextResponse } from "next/server";
import {
  analyzeApplication,
  analyzeSkillGap,
  extractCvProfile,
  matchCareerFit,
  type MarketContext,
} from "@/lib/cv-analysis";
import { getActiveJobStats, getTopKeywordsByCategory } from "@/lib/queries";

// Gemini Pro analysis can take a bit — give it room.
export const maxDuration = 60;
export const runtime = "nodejs";

const MIN_CV_CHARS = 120;
const MIN_JD_CHARS = 80;

type Mode = "analysis" | "gap" | "career";

export async function POST(req: Request) {
  let body: { mode?: string; cv?: string; jobDescription?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Virheellinen pyyntö." }, { status: 400 });
  }

  const mode = (body.mode ?? "analysis") as Mode;
  const cv = (body.cv ?? "").trim();
  const jobDescription = (body.jobDescription ?? "").trim();

  if (cv.length < MIN_CV_CHARS) {
    return NextResponse.json(
      { error: `CV on liian lyhyt (minimi ${MIN_CV_CHARS} merkkiä).` },
      { status: 400 },
    );
  }

  if ((mode === "analysis" || mode === "gap") && jobDescription.length < MIN_JD_CHARS) {
    return NextResponse.json(
      { error: `Työpaikkailmoitus on liian lyhyt (minimi ${MIN_JD_CHARS} merkkiä).` },
      { status: 400 },
    );
  }

  try {
    if (mode === "analysis") {
      const result = await analyzeApplication(cv, jobDescription);
      return NextResponse.json({ mode, result });
    }

    if (mode === "gap") {
      const result = await analyzeSkillGap(cv, jobDescription);
      return NextResponse.json({ mode, result });
    }

    if (mode === "career") {
      const profile = await extractCvProfile(cv);
      const market = await fetchMarketContext();
      const result = await matchCareerFit(profile, market);
      return NextResponse.json({ mode, result, profile, market });
    }

    return NextResponse.json({ error: "Tuntematon tila." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tuntematon virhe";
    console.error("[cv-analysis] failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function fetchMarketContext(): Promise<MarketContext> {
  const [stats, topByCat] = await Promise.all([
    getActiveJobStats().catch(() => ({ totalJobs: 0, totalCompanies: 0 })),
    getTopKeywordsByCategory(
      ["positions", "languages", "frameworks", "cloud", "databases"],
      10,
    ).catch(() => []),
  ]);

  const pickCategory = (cat: string) =>
    topByCat
      .filter((k) => k.category === cat)
      .map((k) => ({ name: k.name, count: k.count }))
      .slice(0, 10);

  return {
    totalActiveJobs: stats.totalJobs,
    topRoles: pickCategory("positions"),
    topLanguages: pickCategory("languages"),
    topFrameworks: pickCategory("frameworks"),
    topCloud: pickCategory("cloud"),
    topDatabases: pickCategory("databases"),
  };
}
