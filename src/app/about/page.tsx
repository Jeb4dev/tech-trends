import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Tietoa palvelusta",
  description: "Koodaripula seuraa Suomen IT-alan työmarkkinatrendejä reaaliajassa. Lue lisää palvelusta ja datasta.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <Breadcrumbs
        items={[
          { label: "Etusivu", href: "/" },
          { label: "Tietoa palvelusta" },
        ]}
      />

      <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">Tietoa palvelusta</h1>

      <div className="space-y-6 text-gray-300">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Mikä on Koodaripula?</h2>
          <p className="text-sm leading-relaxed">
            Koodaripula on ilmainen palvelu, joka seuraa Suomen IT-alan työmarkkinatrendejä reaaliajassa.
            Keräämme ja luokittelemme IT-alan työpaikkailmoituksia automaattisesti tunnistaen yli 600
            teknologiaa, ohjelmointikieltä, sovelluskehystä ja muuta avainsanaa.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Miten data kerätään?</h2>
          <p className="text-sm leading-relaxed">
            Työpaikkailmoitukset haetaan päivittäin{" "}
            <a href="https://duunitori.fi" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
              Duunitorilta
            </a>
            , joka on yksi Suomen suurimmista työpaikkasivustoista. Haku kohdistuu tieto- ja
            tietoliikennetekniikan alan ilmoituksiin.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Miten luokittelu toimii?</h2>
          <p className="text-sm leading-relaxed">
            Jokainen työpaikkailmoitus analysoidaan kahdella tasolla: ensin heuristisella algoritmilla joka
            tunnistaa teknologianimiä ja avainsanoja, ja sen jälkeen tekoälyllä (Google Gemini) joka
            ymmärtää kontekstin ja poimii tarkempia luokitteluja. Luokittelu kattaa 10 kategoriaa:
            ohjelmointikielet, sovelluskehykset, tietokannat, pilvipalvelut, DevOps, data &amp; tekoäly,
            kyberturvallisuus, pehmeät taidot, tehtävänimikkeet ja sijainnit.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Kenelle palvelu on tarkoitettu?</h2>
          <p className="text-sm leading-relaxed">
            Koodaripula on hyödyllinen kaikille IT-alasta kiinnostuneille: työnhakijoille jotka haluavat
            tietää mitä taitoja kysytään, opiskelijoille jotka suunnittelevat opintojaan, yrityksille jotka
            haluavat ymmärtää rekrytointimarkkinaa, ja kaikille jotka seuraavat teknologiatrendejä Suomessa.
          </p>
        </section>
      </div>

      <div className="mt-10 flex gap-3">
        <Link
          href="/trends"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
        >
          Selaa trendejä
        </Link>
        <Link
          href="/"
          className="inline-flex items-center px-5 py-2.5 rounded-lg border border-gray-600 hover:border-gray-500 text-gray-200 hover:text-white text-sm font-medium transition-colors"
        >
          Etusivulle
        </Link>
      </div>
    </div>
  );
}
