import "./globals.css";
import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://koodaripula.fi"),
  title: {
    default: "Koodaripula – Suomen IT-alan työmarkkinatrendit",
    template: "%s | Koodaripula",
  },
  description:
    "Seuraamme reaaliajassa yli 600 teknologian kysyntää suomalaisissa IT-työpaikkailmoituksissa. Ohjelmointikielet, sovelluskehykset, pilvipalvelut, tietoturva ja paljon muuta.",
  applicationName: "Koodaripula",
  keywords: [
    "IT-työpaikat",
    "ohjelmistokehittäjä",
    "tech trends Finland",
    "developer jobs Finland",
    "työmarkkinatrendit",
    "ohjelmointikielet kysyntä",
    "etätyö Suomi",
    "pilvipalvelut työpaikat",
    "tietoturva työpaikat",
    "data science Suomi",
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
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "https://koodaripula.fi",
    siteName: "Koodaripula",
    title: "Koodaripula – Suomen IT-alan työmarkkinatrendit",
    description: "Reaaliaikainen IT-työmarkkinadata: ohjelmointikielet, sovelluskehykset, pilvipalvelut, kyberturvallisuus ja paljon muuta.",
    locale: "fi_FI",
    images: [
      {
        url: "https://koodaripula.fi/og-default.png",
        width: 1200,
        height: 630,
        alt: "Koodaripula – IT-alan työmarkkinatrendit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Koodaripula – Suomen IT-alan työmarkkinatrendit",
    description: "Seuraa reaaliajassa IT-alan kysytyimpiä taitoja Suomessa.",
    images: ["https://koodaripula.fi/og-default.png"],
  },
  alternates: {
    canonical: "/",
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Koodaripula",
    url: "https://koodaripula.fi/",
    description: "Suomen IT-alan työmarkkinatrendit — ohjelmointikielet, sovelluskehykset, pilvipalvelut, tietoturva ja etätyö.",
    inLanguage: "fi",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://koodaripula.fi/advanced-search?rawQuery={search_term_string}",
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: "Koodaripula",
      url: "https://koodaripula.fi/",
    },
  };
  return (
    <html lang="fi" suppressHydrationWarning className="dark">
      <head>
        <script defer data-domain="koodaripula.fi" src="https://analytics.bittive.com/js/script.js"></script>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${inter.className} bg-slate-800 min-h-screen flex flex-col`}>
        <SiteNav />
        <main className="flex-1 container mx-auto p-4">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
