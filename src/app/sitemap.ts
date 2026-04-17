import { MetadataRoute } from "next";
import { getAllCategories, slugifyKeyword } from "@/lib/categories";
import { getAllKeywordSlugs, getTopKeywordsByCategory, getTopLocations } from "@/lib/queries";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://koodaripula.fi").replace(/\/$/, "");

// Categories whose DB key maps directly to a _in param
const TECH_CATEGORIES = ["languages", "frameworks", "databases", "cloud", "devops", "dataScience", "cyberSecurity", "positions"];
const WORK_MODES = ["remote", "hybrid", "onsite"];
const SENIORITY_LEVELS = ["junior", "mid", "senior", "lead"];

function searchUrl(params: Record<string, string>): string {
  // URLSearchParams produces & between params; XML sitemaps require &amp;
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v))
    .toString()
    .replace(/&/g, "&amp;");
  return `${BASE_URL}/advanced-search?${qs}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const categories = getAllCategories();

  // ── Static pages ──────────────────────────────────────────────────────────
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,                 lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE_URL}/trends`,           lastModified: now, changeFrequency: "hourly",  priority: 0.9 },
    { url: `${BASE_URL}/advanced-search`,  lastModified: now, changeFrequency: "daily",   priority: 0.85 },
    { url: `${BASE_URL}/about`,            lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  // ── Trend category pages ───────────────────────────────────────────────────
  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE_URL}/trends/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // ── Keyword detail pages ───────────────────────────────────────────────────
  const keyByCategory = new Map(categories.map((c) => [c.key, c.slug]));
  let keywordEntries: MetadataRoute.Sitemap = [];
  let topKeywords: { category: string; name: string; count: number }[] = [];
  let topLocations: string[] = [];

  try {
    const slugs = await getAllKeywordSlugs();
    keywordEntries = slugs
      .map((s) => {
        const catSlug = keyByCategory.get(s.category);
        if (!catSlug) return null;
        return {
          url: `${BASE_URL}/trends/${catSlug}/${slugifyKeyword(s.name)}`,
          lastModified: now,
          changeFrequency: "daily" as const,
          priority: 0.7,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    topKeywords = await getTopKeywordsByCategory(TECH_CATEGORIES, 15);
    const locs = await getTopLocations(8);
    topLocations = locs.map((l) => l.name);
  } catch {
    // DB unavailable at build time — skip dynamic entries
    return [...staticEntries, ...categoryEntries];
  }

  // ── Advanced-search filter combinations ───────────────────────────────────
  // Group top keywords by category for easy lookup
  const byCategory = new Map<string, string[]>();
  for (const kw of topKeywords) {
    if (!byCategory.has(kw.category)) byCategory.set(kw.category, []);
    byCategory.get(kw.category)!.push(kw.name);
  }

  // Flatten top tech terms across all tech categories (top 20 overall)
  const topTech = topKeywords
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map((k) => ({ name: k.name, param: `${k.category}_in` }));

  const searchEntries: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();

  function addUrl(url: string, priority: number = 0.65) {
    if (seen.has(url)) return;
    seen.add(url);
    searchEntries.push({ url, lastModified: now, changeFrequency: "daily", priority });
  }

  // 1. Single-technology pages (most valuable — direct keyword searches)
  for (const tech of topTech) {
    addUrl(searchUrl({ [tech.param]: tech.name }), 0.75);
  }

  // 2. Tech × location (e.g. "React työpaikat Helsinki")
  for (const tech of topTech.slice(0, 12)) {
    for (const loc of topLocations.slice(0, 6)) {
      addUrl(searchUrl({ [tech.param]: tech.name, locations_in: loc }), 0.7);
    }
  }

  // 3. Tech × work mode (e.g. "Python remote jobs")
  for (const tech of topTech.slice(0, 12)) {
    for (const mode of WORK_MODES) {
      addUrl(searchUrl({ [tech.param]: tech.name, workMode_in: mode }), 0.65);
    }
  }

  // 4. Tech × seniority (e.g. "TypeScript senior developer")
  for (const tech of topTech.slice(0, 10)) {
    for (const level of SENIORITY_LEVELS) {
      addUrl(searchUrl({ [tech.param]: tech.name, seniority_in: level }), 0.65);
    }
  }

  // 5. Work mode only (e.g. "remote IT jobs Finland")
  for (const mode of WORK_MODES) {
    addUrl(searchUrl({ workMode_in: mode }), 0.7);
  }

  // 6. Location only (e.g. "IT-työpaikat Helsinki")
  for (const loc of topLocations) {
    addUrl(searchUrl({ locations_in: loc }), 0.7);
  }

  // 7. Seniority only
  for (const level of SENIORITY_LEVELS) {
    addUrl(searchUrl({ seniority_in: level }), 0.6);
  }

  // 8. Location × work mode (e.g. "Helsinki hybrid työpaikat")
  for (const loc of topLocations.slice(0, 5)) {
    for (const mode of ["remote", "hybrid"]) {
      addUrl(searchUrl({ locations_in: loc, workMode_in: mode }), 0.6);
    }
  }

  // 9. Top language pairs (e.g. "TypeScript React")
  const langs = byCategory.get("languages") ?? [];
  const fws = byCategory.get("frameworks") ?? [];
  for (const lang of langs.slice(0, 6)) {
    for (const fw of fws.slice(0, 6)) {
      addUrl(searchUrl({ languages_in: lang, frameworks_in: fw }), 0.6);
    }
  }

  return [...staticEntries, ...categoryEntries, ...keywordEntries, ...searchEntries];
}
