import type { Metadata } from "next";
import { AdvancedSearchPage } from "./AdvancedSearchClient";

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

const PARAM_LABELS: Record<string, string> = {
  languages_in: "Ohjelmointikielet",
  frameworks_in: "Kehykset",
  databases_in: "Tietokannat",
  cloud_in: "Pilvipalvelut",
  devops_in: "DevOps",
  dataScience_in: "Data Science",
  cyberSecurity_in: "Tietoturva",
  softSkills_in: "Pehmeät taidot",
  positions_in: "Roolit",
  locations_in: "Sijainnit",
  workMode_in: "Työskentelytapa",
  seniority_in: "Kokemus",
};

const WORK_MODE_FI: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybridi",
  onsite: "Toimisto",
};

const SENIORITY_FI: Record<string, string> = {
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  lead: "Lead",
};

function parseParams(sp: Record<string, string>) {
  const techKeys = ["languages_in", "frameworks_in", "databases_in", "cloud_in", "devops_in", "dataScience_in", "cyberSecurity_in", "positions_in"];
  const tech: string[] = [];
  for (const key of techKeys) {
    if (sp[key]) tech.push(...sp[key].split(",").map((v) => v.trim()).filter(Boolean));
  }
  const locations = sp["locations_in"]?.split(",").map((v) => v.trim()).filter(Boolean) ?? [];
  const workModes = sp["workMode_in"]?.split(",").map((v) => WORK_MODE_FI[v.trim()] ?? v.trim()).filter(Boolean) ?? [];
  const seniority = sp["seniority_in"]?.split(",").map((v) => SENIORITY_FI[v.trim()] ?? v.trim()).filter(Boolean) ?? [];
  return { tech, locations, workModes, seniority };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const { tech, locations, workModes, seniority } = parseParams(sp);

  const hasFilters = tech.length > 0 || locations.length > 0 || workModes.length > 0 || seniority.length > 0;

  if (!hasFilters) {
    return {
      title: "Haku — IT-työpaikat Suomessa | Koodaripula",
      description:
        "Etsi IT-työpaikkoja Suomesta teknologian, sijainnin ja työskentelytavan mukaan. Reaaliaikaiset ilmoitukset ohjelmistokehittäjille.",
      alternates: { canonical: "/advanced-search" },
    };
  }

  // Build title
  const parts: string[] = [];
  if (tech.length > 0) parts.push(tech.slice(0, 3).join(", "));
  if (seniority.length > 0) parts.push(seniority[0]);
  if (workModes.length > 0) parts.push(workModes[0]);

  let title = parts.join(" · ");
  if (locations.length > 0) {
    title += ` työpaikat ${locations.slice(0, 2).join(", ")}ssa`;
  } else if (tech.length > 0) {
    title += " työpaikat Suomessa";
  }
  title += " — Koodaripula";

  // Build description
  const techStr = tech.slice(0, 4).join(", ");
  const locStr = locations.length > 0 ? ` ${locations.slice(0, 2).join("/")}ssa` : " Suomessa";
  const modeStr = workModes.length > 0 ? ` ${workModes[0].toLowerCase()} -työ.` : "";
  const senStr = seniority.length > 0 ? ` ${seniority[0]} -taso.` : "";
  const description = `Avoimet ${techStr || "IT"}-työpaikat${locStr}.${modeStr}${senStr} Palkat, trendit ja reaaliaikaiset ilmoitukset — Koodaripula.fi`;

  // Canonical URL preserving the filter params
  const canonicalParams = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => Boolean(v))
  ).toString();

  // Build keyword list for Google
  const keywords: string[] = [];
  for (const t of tech.slice(0, 5)) {
    keywords.push(`${t} työpaikat`, `${t} palkka`, `${t} jobs Finland`, `${t} salary finland`);
    if (locations.length > 0) keywords.push(`${t} työpaikat ${locations[0]}`, `${t} palkka suomi`);
  }

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `/advanced-search${canonicalParams ? `?${canonicalParams}` : ""}` },
    openGraph: {
      title,
      description,
      url: `/advanced-search${canonicalParams ? `?${canonicalParams}` : ""}`,
    },
  };
}

export default function Page(props: PageProps) {
  return <AdvancedSearchPage />;
}
