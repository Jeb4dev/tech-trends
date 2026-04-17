import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug, getAllCategories } from "@/lib/categories";
import { getTopKeywords } from "@/lib/queries";
import CategoryPage from "./CategoryPageClient";

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return getAllCategories().map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: catSlug } = await params;
  const cat = getCategoryBySlug(catSlug);
  if (!cat) return {};

  // Fetch top keywords to enrich description and keyword list
  let topNames: string[] = [];
  try {
    const top = await getTopKeywords(cat.key, 8);
    topNames = top.map((k) => k.name);
  } catch {
    // DB unavailable at build time
  }

  const topStr = topNames.slice(0, 5).join(", ");

  const title = `${cat.nameFi} — trendit ja palkat Suomessa | Koodaripula`;
  const description = topNames.length > 0
    ? `${cat.nameFi}: ${topStr} ja muut. Reaaliaikaiset kysyntätrendit, palkat ja avoimet työpaikat Suomessa. ${cat.nameEn} jobs & salaries in Finland.`
    : `${cat.nameFi}: reaaliaikaiset kysyntätrendit, palkat ja avoimet IT-työpaikat Suomessa. ${cat.nameEn} jobs & salaries in Finland.`;

  const keywords = [
    ...topNames.flatMap((n) => [`${n} palkka`, `${n} työpaikat`]),
    `${cat.nameFi} palkka`,
    `${cat.nameFi} työpaikat`,
    `${cat.nameEn} jobs finland`,
    `${cat.nameEn} salary finland`,
    "IT-palkat Suomi",
  ];

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `/trends/${catSlug}` },
    openGraph: { title, description, url: `https://koodaripula.fi/trends/${catSlug}` },
  };
}

export default async function Page({ params }: PageProps) {
  const { category: catSlug } = await params;
  if (!getCategoryBySlug(catSlug)) notFound();
  return <CategoryPage />;
}
