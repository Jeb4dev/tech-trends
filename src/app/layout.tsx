import "./globals.css";
import { Inter } from "next/font/google";
import type { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://jobs.bittive.com"),
  title: {
    default: "Tech Trends | Koodaripula",
    template: "%s | Koodaripula Tech Trends",
  },
  description: "Live Finnish tech job market trends: languages, frameworks, cloud, DevOps, cyber security, work modes (remote / hybrid / on-site) and more.",
  applicationName: "Koodaripula Tech Trends",
  keywords: [
    "Finland jobs",
    "tech trends",
    "developer jobs",
    "ohjelmistokehittäjä",
    "tietoturva",
    "remote work Finland",
    "hybrid work",
    "cloud jobs",
    "cyber security jobs",
    "data science jobs",
  ],
  authors: [{ name: "Koodaripula" }],
  creator: "Koodaripula",
  publisher: "Koodaripula",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Use dashed keys per Next.js Metadata spec
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "https://jobs.bittive.com",
    siteName: "Koodaripula Tech Trends",
    title: "Finnish Tech Job Market Trends",
    description: "Track in‑demand software skills: languages, frameworks, security, data & work mode classification.",
    locale: "en_US",
    images: [
      {
        url: "https://jobs.bittive.com/og-default.png",
        width: 1200,
        height: 630,
        alt: "Koodaripula Tech Trends Overview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Finnish Tech Job Market Trends",
    description: "Live tracking of in‑demand software & security skills in Finland.",
    images: ["https://jobs.bittive.com/og-default.png"],
  },
  alternates: {
    canonical: "/",
  },
  category: "technology",
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Koodaripula Tech Trends",
    url: "https://jobs.bittive.com/",
    description: "Finnish tech job market trends & classification (remote / hybrid / on-site)",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://jobs.bittive.com/trends?search={search_term_string}",
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: "Koodaripula",
      url: "https://jobs.bittive.com/",
    },
  };
  return (
    <html lang="en">
      <head>
        <script defer data-domain="jobs.bittive.com" src="https://analytics.bittive.com/js/script.js"></script>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${inter.className} bg-slate-800 container mx-auto p-4`}>{children}</body>
    </html>
  );
}
