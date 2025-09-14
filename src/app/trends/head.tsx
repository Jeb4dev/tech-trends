export default function Head() {
  const canonical = "https://koodaripula.fi/trends";
  const title = "Finnish Tech Job Trends (Live) | Koodaripula";
  const description = "Live Finnish developer job market trends: languages, frameworks, cloud, DevOps, cyber security, data science, work mode (remote / hybrid / on-site).";
  const image = "https://koodaripula.fi/og-default.png";
  const keywords = [
    "Finnish developer jobs",
    "Finland tech trends",
    "remote developer Finland",
    "cyber security jobs Finland",
    "data science Finland",
    "cloud engineer Finland",
  ].join(", ");

  const ldBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://koodaripula.fi/" },
      { "@type": "ListItem", position: 2, name: "Trends", item: canonical },
    ],
  };
  const ldDataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Finnish Tech Job Skill Demand Dataset",
    description,
    license: "https://github.com/Jeb4dev/tech-trends/blob/main/LICENSE",
    creator: { "@type": "Organization", name: "Koodaripula" },
    url: canonical,
    isAccessibleForFree: true,
  };

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index,follow" />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Koodaripula Tech Trends" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldDataset) }} />
    </>
  );
}

