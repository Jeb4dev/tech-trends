import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";

// TODO(auth): Integrate user authentication (OAuth/email) for profile features
// TODO(profile): Build skills assessment form with autocomplete from src/keywords.ts
// TODO(matching): Implement job-to-profile scoring algorithm using tag co-occurrence from job_tags
// TODO(skill-gaps): Query related keywords for user's existing skills to identify market gaps
// TODO(applications): Use Gemini (src/lib/gemini.ts) for cover letter/CV generation

interface FeatureInfo {
  title: string;
  description: string;
  bullets: string[];
}

const FEATURES: Record<string, FeatureInfo> = {
  profile: {
    title: "Oma profiili",
    description:
      "Lisää osaamisesi, kokemuksesi ja ansioluettelosi. Seuraa miten osaamisesi vastaa työmarkkinoiden kysyntää.",
    bullets: [
      "Listaa teknologiaosaamisesi ja kokemustasosi",
      "Lataa CV ja anna tekoälyn analysoida se",
      "Seuraa osaamisesi kehitystä suhteessa markkinatrendeihin",
    ],
  },
  match: {
    title: "Työpaikkaehdotukset",
    description:
      "Tekoälypohjainen työpaikkojen suosittelu profiilisi perusteella. Löydä sinulle parhaiten sopivat avoimet paikat.",
    bullets: [
      "Automaattiset ehdotukset osaamisprofiilisi perusteella",
      "Yhteensopivuuspisteytys jokaiselle työpaikalle",
      "Ilmoitukset uusista osumista sähköpostiin",
    ],
  },
  "skill-gaps": {
    title: "Osaamisvaje-analyysi",
    description:
      "Tunnista taidot joiden oppiminen parantaisi työllistymistäsi. Tiedä mitä teknologioita mainitaan usein yhdessä osaamistesi kanssa.",
    bullets: [
      "Vertaa osaamistasi reaaliaikaiseen markkinakysyntään",
      "Tunnista puuttuvat taidot jotka esiintyvät usein yhdessä nykyisten taitojesi kanssa",
      "Saat oppimissuosituksia ja priorisoinnin vaikuttavuuden perusteella",
    ],
  },
  applications: {
    title: "Hakemusten hallinta",
    description:
      "Luo räätälöityjä saatekirjeitä, muokkaa CV:tä eri tehtäviin sopivaksi ja seuraa hakemuksiasi yhdessä paikassa.",
    bullets: [
      "AI-avusteinen saatekirjeen generointi työpaikkailmoituksen perusteella",
      "CV:n räätälöinti automaattisesti tehtävän vaatimusten mukaan",
      "Hakemusten seuranta ja muistutukset",
    ],
  },
};

const featureSlugs = Object.keys(FEATURES);

type Props = {
  params: Promise<{ feature: string }>;
};

export function generateStaticParams() {
  return featureSlugs.map((feature) => ({ feature }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { feature } = await params;
  const info = FEATURES[feature];
  if (!info) return {};

  return {
    title: `${info.title} – Tulossa pian`,
    description: info.description,
    robots: { index: false, follow: true },
  };
}

export default async function ComingSoonPage({ params }: Props) {
  const { feature } = await params;
  const info = FEATURES[feature];
  if (!info) notFound();

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Breadcrumbs
        items={[
          { label: "Etusivu", href: "/" },
          { label: "Tulossa pian" },
          { label: info.title },
        ]}
      />

      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white">{info.title}</h1>
        <span className="px-2 py-1 text-xs font-medium rounded bg-green-500/15 text-green-400 border border-green-500/30">
          Tulossa pian
        </span>
      </div>

      <p className="text-gray-400 mb-8">{info.description}</p>

      <div className="rounded-lg border border-gray-700 bg-zinc-900/40 p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-200 mb-4">Mitä tämä ominaisuus tarjoaa</h2>
        <ul className="space-y-3">
          {info.bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
              <span className="text-sm text-gray-300">{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-600 hover:border-gray-500 text-gray-200 hover:text-white text-sm font-medium transition-colors"
        >
          Tutustu nykyisiin ominaisuuksiin
        </Link>
        <Link
          href="/trends"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
        >
          Selaa trendejä
        </Link>
      </div>

      {/* Other coming soon features */}
      <div className="mt-12 border-t border-gray-700/50 pt-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Muut tulevat ominaisuudet</h2>
        <div className="flex flex-wrap gap-2">
          {featureSlugs
            .filter((s) => s !== feature)
            .map((s) => (
              <Link
                key={s}
                href={`/coming-soon/${s}`}
                className="px-3 py-1.5 text-xs rounded-md border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
              >
                {FEATURES[s].title}
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
