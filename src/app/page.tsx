import type { Metadata } from "next";
import Link from "next/link";
import { Search, BarChart3, Cpu, ArrowRight } from "lucide-react";
import StatCard from "@/components/StatCard";
import CategoryCard from "@/components/CategoryCard";
import QuickSearch from "@/components/QuickSearch";
import TrendBadge from "@/components/TrendBadge";
import ComingSoonBanner from "@/components/ComingSoonBanner";
import { getAllCategories, getCategoryByKey } from "@/lib/categories";
import { getActiveJobStats, getTrendingKeywords, getTopKeywords, getCategoryStats } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Koodaripula – Suomen IT-alan työmarkkinatrendit",
  description:
    "Seuraamme reaaliajassa yli 600 teknologian kysyntää suomalaisissa IT-työpaikkailmoituksissa. Selaa trendejä, palkkoja ja kysyntäsignaaleja.",
  openGraph: {
    title: "Koodaripula – Suomen IT-alan työmarkkinatrendit",
    description:
      "Reaaliaikainen IT-työmarkkinadata: ohjelmointikielet, sovelluskehykset, pilvipalvelut, kyberturvallisuus ja paljon muuta.",
    url: "https://koodaripula.fi/",
  },
  alternates: {
    canonical: "/",
  },
};

export const revalidate = 3600;

export default async function HomePage() {
  const [stats, trending, topKeywords, categoryStats] = await Promise.all([
    getActiveJobStats().catch(() => ({ totalJobs: 0, totalCompanies: 0 })),
    getTrendingKeywords(30, 5).catch(() => []),
    getTopKeywords(null, 5).catch(() => []),
    getCategoryStats().catch(() => []),
  ]);

  const allCategories = getAllCategories();
  const categoryStatsMap = new Map(categoryStats.map((cs) => [cs.category, cs]));

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero */}
      <section className="relative py-20 md:py-32 text-center overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/[0.04] rounded-full blur-3xl" />
          <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-emerald-500/[0.03] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[250px] h-[250px] bg-cyan-500/[0.02] rounded-full blur-3xl" />
        </div>

        <p className="text-sm font-medium text-green-400/80 tracking-widest uppercase mb-4">
          Reaaliaikainen data
        </p>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight">
          Suomen IT-alan
          <br />
          <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            työmarkkinatrendit
          </span>
        </h1>
        <p className="mt-6 text-base md:text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
          Seuraamme yli 600 teknologian kysyntää suomalaisissa työpaikkailmoituksissa — päivittäin.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/trends"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-green-600 hover:bg-green-500 text-white font-semibold transition-all duration-200 shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
          >
            <BarChart3 className="w-4 h-4" />
            Selaa trendejä
          </Link>
          <Link
            href="/advanced-search"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-medium transition-all duration-200"
          >
            <Search className="w-4 h-4" />
            Hae työpaikkoja
          </Link>
        </div>
      </section>

      {/* Live Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-20">
        <StatCard label="Avoimet työpaikat" value={stats.totalJobs} />
        <StatCard label="Yrityksiä" value={stats.totalCompanies} />
        <StatCard label="Teknologioita seurannassa" value="600+" />
        <StatCard label="Kategorioita" value={10} />
      </section>

      {/* Quick Search */}
      <section className="mb-20">
        <div className="text-center mb-5">
          <p className="text-sm text-gray-500">Etsi teknologiaa, kieltä tai työpaikkaa</p>
        </div>
        <QuickSearch />
      </section>

      {/* Featured Trends */}
      {(trending.length > 0 || topKeywords.length > 0) && (
        <section className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {trending.length > 0 && (
              <div className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-700/30">
                  <h2 className="text-base font-semibold text-white">Nousussa</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Viimeisen 30 päivän kasvu</p>
                </div>
                <ul className="divide-y divide-gray-700/30">
                  {trending.map((kw) => {
                    const cat = getCategoryByKey(kw.category);
                    return (
                      <li key={`${kw.category}-${kw.name}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-700/10 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-100">{kw.name}</span>
                          {cat && (
                            <Link
                              href={`/trends/${cat.slug}`}
                              className="text-[11px] text-gray-500 hover:text-green-400 transition-colors"
                            >
                              {cat.nameFi}
                            </Link>
                          )}
                        </div>
                        <TrendBadge delta={kw.delta} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {topKeywords.length > 0 && (
              <div className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-700/30">
                  <h2 className="text-base font-semibold text-white">Kysytyimmät</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Eniten mainintoja avoimissa paikoissa</p>
                </div>
                <ul className="divide-y divide-gray-700/30">
                  {topKeywords.map((kw) => {
                    const cat = getCategoryByKey(kw.category);
                    return (
                      <li key={`${kw.category}-${kw.name}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-700/10 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-100">{kw.name}</span>
                          {cat && (
                            <Link
                              href={`/trends/${cat.slug}`}
                              className="text-[11px] text-gray-500 hover:text-green-400 transition-colors"
                            >
                              {cat.nameFi}
                            </Link>
                          )}
                        </div>
                        <span className="text-xs font-mono text-gray-400">
                          {kw.count.toLocaleString("fi-FI")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Category Overview Grid */}
      <section className="mb-20">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Kategoriat</h2>
            <p className="text-sm text-gray-500 mt-1">Tutustu eri osa-alueiden trendeihin</p>
          </div>
          <Link href="/trends" className="hidden sm:inline-flex items-center gap-1 text-sm text-green-400 hover:text-green-300 transition-colors">
            Kaikki trendit <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {allCategories.map((cat) => {
            const catStats = categoryStatsMap.get(cat.key);
            return (
              <CategoryCard
                key={cat.slug}
                category={cat}
                totalJobs={catStats?.totalJobs || 0}
                topKeywords={catStats?.topKeywords || []}
              />
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="mb-20">
        <div className="text-center mb-10">
          <h2 className="text-xl md:text-2xl font-bold text-white">Miten se toimii</h2>
          <p className="text-sm text-gray-500 mt-1">Kolme askelta datasta oivalluksiin</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-gray-700/30 rounded-xl overflow-hidden border border-gray-700/50">
          <div className="bg-gray-900/80 p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 text-green-400 mb-5">
              <Search className="w-6 h-6" />
            </div>
            <div className="text-xs font-semibold text-green-400/70 uppercase tracking-wider mb-2">1. Keräämme</div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Haemme IT-alan työpaikkailmoitukset päivittäin Duunitorilta.
            </p>
          </div>
          <div className="bg-gray-900/80 p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 text-green-400 mb-5">
              <Cpu className="w-6 h-6" />
            </div>
            <div className="text-xs font-semibold text-green-400/70 uppercase tracking-wider mb-2">2. Luokittelemme</div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Tekoäly ja algoritmit tunnistavat yli 600 teknologiaa, työmuotoa ja palkkatietoa.
            </p>
          </div>
          <div className="bg-gray-900/80 p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 text-green-400 mb-5">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="text-xs font-semibold text-green-400/70 uppercase tracking-wider mb-2">3. Löydät</div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Selaa trendejä, palkkoja ja kysyntäsignaaleja — ja löydä sopiva työpaikka.
            </p>
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="mb-20">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white">Tulossa pian</h2>
          <p className="text-sm text-gray-500 mt-1">Uusia ominaisuuksia kehitteillä</p>
        </div>
        <ComingSoonBanner />
      </section>
    </div>
  );
}
