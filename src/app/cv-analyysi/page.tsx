import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import CvAnalysisClient from "./CvAnalysisClient";

export const metadata: Metadata = {
  title: "Tekoäly-CV-analyysi — mitä rekrytoija oikeasti ajattelee?",
  description:
    "Liitä CV ja työpaikkailmoitus — saat ATS-läpäisytodennäköisyyden, rekrytoijan arvion, osaamisvajeet ja konkreettiset parannusehdotukset. Lisäksi urapolku-analyysi jossa CV:si peilataan Suomen IT-työmarkkinadataan.",
  alternates: { canonical: "/cv-analyysi" },
  openGraph: {
    title: "Tekoäly-CV-analyysi | Koodaripula",
    description:
      "Simuloi rekrytoijan ja ATS:n päätös hakemukseesi. Löydä osaamisvajeet ja sopivimmat työpaikat.",
    url: "https://koodaripula.fi/cv-analyysi",
  },
};

export default function CvAnalysisPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <Breadcrumbs
        items={[
          { label: "Etusivu", href: "/" },
          { label: "CV-analyysi" },
        ]}
      />

      <section className="relative py-12 md:py-16 text-center overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-500/[0.04] rounded-full blur-3xl" />
        </div>
        <p className="text-sm font-medium text-green-400/80 tracking-widest uppercase mb-3">
          Tekoälypohjainen rekrytoija-analyysi
        </p>
        <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
          Mitä rekrytoija oikeasti
          <br />
          <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            ajattelee CV:stäsi?
          </span>
        </h1>
        <p className="mt-5 text-sm md:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Liitä CV ja työpaikkailmoitus. Saat ATS-läpäisytodennäköisyyden, rekrytoijan kiinnostuksen ja konkreettiset askeleet joilla hakemus paranee.
          Suomalaisen IT-markkinan tunteva tekoäly — ei tallenna tietojasi.
        </p>
      </section>

      <CvAnalysisClient />
    </div>
  );
}
