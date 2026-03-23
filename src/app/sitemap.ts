import { MetadataRoute } from "next";
import { getAllCategories, slugifyKeyword } from "@/lib/categories";
import { getAllKeywordSlugs } from "@/lib/queries";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://koodaripula.fi").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const categories = getAllCategories();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/trends`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/advanced-search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE_URL}/trends/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Dynamic keyword detail pages
  const keyByCategory = new Map(categories.map((c) => [c.key, c.slug]));
  let keywordEntries: MetadataRoute.Sitemap = [];
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
  } catch {
    // DB unavailable at build time — skip keyword entries
  }

  return [...staticEntries, ...categoryEntries, ...keywordEntries];
}
