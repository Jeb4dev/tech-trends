import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, MapPin, Briefcase, Calendar, ExternalLink } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import KeywordTrendChart from "@/components/charts/KeywordTrendChart";
import SalaryRangeChart from "@/components/charts/SalaryRangeChart";
import WorkModePieChart from "@/components/charts/WorkModePieChart";
import SeniorityBarChart from "@/components/charts/SeniorityBarChart";
import {
  getCategoryBySlug,
  getCategoryByKey,
  slugifyKeyword,
  deslugifyKeyword,
  getAllCategories,
} from "@/lib/categories";
import {
  getTagByKeyword,
  getKeywordTrendData,
  getKeywordActiveJobCount,
  getKeywordSalaryStats,
  getCoOccurringKeywords,
  getTopCompaniesForKeyword,
  getTopLocationsForKeyword,
  getWorkModeDistribution,
  getSeniorityDistribution,
  getRecentJobsForKeyword,
  getAllKeywordSlugs,
} from "@/lib/queries";

export const revalidate = 3600;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ category: string; keyword: string }>;
}

export async function generateStaticParams() {
  try {
    const slugs = await getAllKeywordSlugs();
    const categories = getAllCategories();
    const keyByCategory = new Map(categories.map((c) => [c.key, c.slug]));
    return slugs
      .map((s) => ({
        category: keyByCategory.get(s.category) || s.category,
        keyword: slugifyKeyword(s.name),
      }))
      .filter((p) => p.category && p.keyword);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: catSlug, keyword: kwSlug } = await params;
  const cat = getCategoryBySlug(catSlug);
  if (!cat) return {};

  const rawName = deslugifyKeyword(kwSlug);
  const tag = await getTagByKeyword(cat.key, rawName).catch(() => null);
  if (!tag) return {};

  const [jobCount, salary] = await Promise.all([
    getKeywordActiveJobCount(tag.id).catch(() => 0),
    getKeywordSalaryStats(tag.id).catch(() => null),
  ]);

  const salaryText = salary ? ` Keskipalkka ${salary.avg.toLocaleString("fi-FI")}€/kk.` : "";
  const title = `${tag.name} työpaikat Suomessa — trendit ja palkat`;
  const description = `${jobCount} avointa ${tag.name}-työpaikkaa.${salaryText} Katso trendit, yritykset ja kaupungit. ${tag.name} jobs in Finland.`;

  return {
    title,
    description,
    keywords: [
      tag.name,
      `${tag.name} jobs`,
      `${tag.name} työpaikat`,
      `${tag.name} palkka`,
      cat.nameFi,
      "Finland",
      "Suomi",
      "IT-työpaikat",
    ],
    alternates: { canonical: `/trends/${catSlug}/${kwSlug}` },
    openGraph: {
      title,
      description,
      url: `https://koodaripula.fi/trends/${catSlug}/${kwSlug}`,
    },
  };
}

export default async function KeywordPage({ params }: PageProps) {
  const { category: catSlug, keyword: kwSlug } = await params;
  const cat = getCategoryBySlug(catSlug);
  if (!cat) notFound();

  const rawName = deslugifyKeyword(kwSlug);
  const tag = await getTagByKeyword(cat.key, rawName);
  if (!tag) notFound();

  const [trendData, jobCount, salary, coOccurring, companies, locations, workModes, seniority, recentJobs] =
    await Promise.all([
      getKeywordTrendData(tag.id, 90).catch(() => []),
      getKeywordActiveJobCount(tag.id).catch(() => 0),
      getKeywordSalaryStats(tag.id).catch(() => null),
      getCoOccurringKeywords(tag.id, 15).catch(() => []),
      getTopCompaniesForKeyword(tag.id, 10).catch(() => []),
      getTopLocationsForKeyword(tag.id, 10).catch(() => []),
      getWorkModeDistribution(tag.id).catch(() => []),
      getSeniorityDistribution(tag.id).catch(() => []),
      getRecentJobsForKeyword(tag.id, 10).catch(() => []),
    ]);

  // Group co-occurring by category
  const coByCategory = new Map<string, { name: string; count: number }[]>();
  for (const co of coOccurring) {
    const list = coByCategory.get(co.category) || [];
    list.push({ name: co.name, count: co.count });
    coByCategory.set(co.category, list);
  }

  // Structured data: FAQPage
  const faqEntries: { q: string; a: string }[] = [
    { q: `Montako ${tag.name}-työpaikkaa on avoinna Suomessa?`, a: `${jobCount} avointa ${tag.name}-työpaikkaa.` },
  ];
  if (salary) {
    faqEntries.push({
      q: `Mikä on ${tag.name}-kehittäjän keskipalkka?`,
      a: `${tag.name}-osaajan keskipalkka on ${salary.avg.toLocaleString("fi-FI")}€/kk (mediaani ${salary.median.toLocaleString("fi-FI")}€/kk).`,
    });
  }
  if (companies.length > 0) {
    faqEntries.push({
      q: `Mitkä yritykset palkkaavat ${tag.name}-osaajia?`,
      a: `Suurimmat rekrytoijat: ${companies.slice(0, 3).map((c) => c.company).join(", ")}.`,
    });
  }
  if (coOccurring.length > 0) {
    faqEntries.push({
      q: `Mitä teknologioita käytetään yhdessä ${tag.name}:n kanssa?`,
      a: `Yleisimmin mainitaan: ${coOccurring.slice(0, 5).map((c) => c.name).join(", ")}.`,
    });
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqEntries.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // JobPosting structured data for recent jobs
  const jobPostingSchemas = recentJobs.slice(0, 5).map((job) => ({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.heading,
    datePosted: job.date_posted,
    hiringOrganization: { "@type": "Organization", name: job.company_name },
    jobLocation: job.municipality_name
      ? { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.municipality_name, addressCountry: "FI" } }
      : undefined,
    baseSalary: job.salary_min && job.salary_max
      ? { "@type": "MonetaryAmount", currency: "EUR", value: { "@type": "QuantitativeValue", minValue: job.salary_min, maxValue: job.salary_max, unitText: "MONTH" } }
      : undefined,
  }));

  return (
    <div className="max-w-5xl mx-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      {jobPostingSchemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Etusivu", href: "/" },
          { label: "Trendit", href: "/trends" },
          { label: cat.nameFi, href: `/trends/${catSlug}` },
          { label: tag.name },
        ]}
      />

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href={`/trends/${catSlug}`}
            className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
          >
            {cat.nameFi}
          </Link>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
          {tag.name} Suomessa
          <span className="block text-lg md:text-xl font-medium text-gray-400 mt-1">
            Työpaikat ja trendit
          </span>
        </h1>
      </header>

      {/* Stats Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatBox label="Avoimet työpaikat" value={jobCount.toLocaleString("fi-FI")} />
        <StatBox label="Keskipalkka" value={salary ? `${salary.avg.toLocaleString("fi-FI")}€` : "—"} />
        <StatBox label="Mediaanipalkka" value={salary ? `${salary.median.toLocaleString("fi-FI")}€` : "—"} />
        <StatBox label="Yrityksiä" value={companies.length.toLocaleString("fi-FI")} />
      </section>

      {/* Trend Chart */}
      {trendData.length > 0 && (
        <section className="mb-10">
          <KeywordTrendChart data={trendData} keywordName={tag.name} />
        </section>
      )}

      {/* Salary Section */}
      {salary && (
        <section className="mb-10">
          <div className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700/30">
              <h2 className="text-base font-semibold text-white">{tag.name} — palkkatiedot</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Perustuu {salary.sampleCount} ilmoitukseen, joissa palkka on ilmoitettu (€/kk)
              </p>
            </div>
            <div className="p-5">
              <SalaryRangeChart min={salary.min} avg={salary.avg} median={salary.median} max={salary.max} />
            </div>
          </div>
        </section>
      )}

      {/* Two-column layout: Companies & Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {/* Companies */}
        {companies.length > 0 && (
          <section className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700/30">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-green-400" />
                Yritykset jotka palkkaavat {tag.name}-osaajia
              </h2>
            </div>
            <ul className="divide-y divide-gray-700/30">
              {companies.map((c) => (
                <li key={c.company} className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-sm text-gray-200">{c.company}</span>
                  <span className="text-xs font-mono text-gray-400">{c.count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Locations */}
        {locations.length > 0 && (
          <section className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700/30">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-400" />
                Suosituimmat kaupungit
              </h2>
            </div>
            <ul className="divide-y divide-gray-700/30">
              {locations.map((l) => (
                <li key={l.city} className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-sm text-gray-200">{l.city}</span>
                  <span className="text-xs font-mono text-gray-400">{l.count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Two-column: Work Mode & Seniority */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {workModes.length > 0 && (
          <section className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700/30">
              <h2 className="text-base font-semibold text-white">Etä / hybridi / toimisto</h2>
            </div>
            <div className="p-5">
              <WorkModePieChart data={workModes} />
            </div>
          </section>
        )}

        {seniority.length > 0 && (
          <section className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700/30">
              <h2 className="text-base font-semibold text-white">Kokemustasojakauma</h2>
            </div>
            <div className="p-5">
              <SeniorityBarChart data={seniority} />
            </div>
          </section>
        )}
      </div>

      {/* Co-occurring Technologies */}
      {coOccurring.length > 0 && (
        <section className="mb-10">
          <div className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700/30">
              <h2 className="text-base font-semibold text-white">
                Usein mainitaan yhdessä: {tag.name}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Teknologiat jotka esiintyvät samoissa ilmoituksissa
              </p>
            </div>
            <div className="p-5">
              {Array.from(coByCategory.entries()).map(([catKey, keywords]) => {
                const coCat = getCategoryByKey(catKey);
                return (
                  <div key={catKey} className="mb-4 last:mb-0">
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      {coCat?.nameFi || catKey}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((kw) => {
                        const coSlug = coCat?.slug || catKey;
                        const kwSlugLink = slugifyKeyword(kw.name);
                        return (
                          <Link
                            key={kw.name}
                            href={`/trends/${coSlug}/${kwSlugLink}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-700/40 text-gray-200 hover:bg-green-500/15 hover:text-green-300 transition-colors border border-gray-600/30 hover:border-green-500/30"
                          >
                            {kw.name}
                            <span className="text-xs text-gray-500">{kw.count}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <section className="mb-10">
          <div className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700/30">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-green-400" />
                Uusimmat {tag.name}-työpaikat
              </h2>
            </div>
            <ul className="divide-y divide-gray-700/30">
              {recentJobs.map((job) => (
                <li key={job.id} className="px-5 py-3 hover:bg-gray-700/10 transition-colors">
                  <Link
                    href={`https://duunitori.fi/tyopaikat/tyo/${job.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-100 group-hover:text-green-300 transition-colors truncate">
                          {job.heading}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {job.company_name}
                          </span>
                          {job.municipality_name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {job.municipality_name}
                            </span>
                          )}
                          {job.date_posted && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {job.date_posted}
                            </span>
                          )}
                        </div>
                        {job.salary_min && job.salary_max && (
                          <p className="text-xs text-green-400/70 mt-1">
                            {job.salary_min.toLocaleString("fi-FI")}–{job.salary_max.toLocaleString("fi-FI")} €/kk
                          </p>
                        )}
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-green-400 transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mb-10 text-center">
        <Link
          href={`/advanced-search?${cat.key}_in=${encodeURIComponent(tag.name)}`}
          className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-green-600 hover:bg-green-500 text-white font-semibold transition-all duration-200 shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
        >
          Hae kaikki {tag.name}-työpaikat
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Related: sibling keywords in same category */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">
          Muita avainsanoja: {cat.nameFi}
        </h2>
        <div className="flex flex-wrap gap-2">
          {coOccurring
            .filter((co) => co.category === cat.key)
            .slice(0, 12)
            .map((co) => (
              <Link
                key={co.name}
                href={`/trends/${catSlug}/${slugifyKeyword(co.name)}`}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-700/40 text-gray-300 hover:bg-green-500/15 hover:text-green-300 transition-colors border border-gray-600/30 hover:border-green-500/30"
              >
                {co.name}
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl md:text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
