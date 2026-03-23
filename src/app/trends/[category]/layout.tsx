import type { Metadata } from "next";
import { getCategoryBySlug, getAllCategories } from "@/lib/categories";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ category: string }>;
  children: React.ReactNode;
};

export async function generateStaticParams() {
  return getAllCategories().map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const info = getCategoryBySlug(category);
  if (!info) return {};

  return {
    title: `${info.nameFi} – trendit`,
    description: info.descriptionFi,
    openGraph: {
      title: `${info.nameFi} – Koodaripula`,
      description: info.descriptionFi,
      url: `https://koodaripula.fi/trends/${info.slug}`,
    },
    alternates: {
      canonical: `/trends/${info.slug}`,
    },
  };
}

export default async function CategoryLayout({ params, children }: Props) {
  const { category } = await params;
  const info = getCategoryBySlug(category);
  if (!info) notFound();
  return <>{children}</>;
}
