export interface CategoryInfo {
  slug: string;
  key: string; // DB/API category key (camelCase)
  nameFi: string;
  nameEn: string;
  descriptionFi: string;
  icon: string; // lucide-react icon name
}

const CATEGORIES: CategoryInfo[] = [
  {
    slug: "languages",
    key: "languages",
    nameFi: "Ohjelmointikielet",
    nameEn: "Languages",
    descriptionFi: "Ohjelmointikielten kysyntä suomalaisissa IT-työpaikkailmoituksissa.",
    icon: "Code",
  },
  {
    slug: "frameworks",
    key: "frameworks",
    nameFi: "Sovelluskehykset",
    nameEn: "Frameworks",
    descriptionFi: "Sovelluskehysten ja kirjastojen kysyntätrendit.",
    icon: "Layers",
  },
  {
    slug: "databases",
    key: "databases",
    nameFi: "Tietokannat",
    nameEn: "Databases",
    descriptionFi: "Tietokantojen ja tietovarastojen kysyntä.",
    icon: "Database",
  },
  {
    slug: "cloud",
    key: "cloud",
    nameFi: "Pilvipalvelut",
    nameEn: "Cloud",
    descriptionFi: "Pilvialustojen ja -palveluiden kysyntä.",
    icon: "Cloud",
  },
  {
    slug: "devops",
    key: "devops",
    nameFi: "DevOps",
    nameEn: "DevOps",
    descriptionFi: "DevOps-työkalujen ja -käytäntöjen kysyntä.",
    icon: "GitBranch",
  },
  {
    slug: "data-science",
    key: "dataScience",
    nameFi: "Data & tekoäly",
    nameEn: "Data Science",
    descriptionFi: "Data science-, koneoppimis- ja tekoälyosaamisen kysyntä.",
    icon: "BrainCircuit",
  },
  {
    slug: "cyber-security",
    key: "cyberSecurity",
    nameFi: "Kyberturvallisuus",
    nameEn: "Cyber Security",
    descriptionFi: "Tietoturva- ja kyberturvallisuusosaamisen kysyntä.",
    icon: "Shield",
  },
  {
    slug: "soft-skills",
    key: "softSkills",
    nameFi: "Pehmeät taidot",
    nameEn: "Soft Skills",
    descriptionFi: "Pehmeät taidot ja työelämätaidot IT-työpaikkailmoituksissa.",
    icon: "Users",
  },
  {
    slug: "positions",
    key: "positions",
    nameFi: "Tehtävänimikkeet",
    nameEn: "Positions",
    descriptionFi: "IT-alan tehtävänimikkeiden ja roolien kysyntä.",
    icon: "Briefcase",
  },
  {
    slug: "locations",
    key: "locations",
    nameFi: "Sijainnit",
    nameEn: "Locations",
    descriptionFi: "IT-työpaikkojen maantieteellinen jakautuminen.",
    icon: "MapPin",
  },
];

const bySlug = new Map(CATEGORIES.map((c) => [c.slug, c]));
const byKey = new Map(CATEGORIES.map((c) => [c.key, c]));

export function getCategoryBySlug(slug: string): CategoryInfo | undefined {
  return bySlug.get(slug);
}

export function getCategoryByKey(key: string): CategoryInfo | undefined {
  return byKey.get(key);
}

export function getAllCategories(): CategoryInfo[] {
  return CATEGORIES;
}

// Keyword slug helpers
const KEYWORD_SLUG_MAP: Record<string, string> = {
  "C#": "csharp",
  "C++": "cpp",
  ".NET": "dotnet",
  "ASP.NET": "aspnet",
  "Node.js": "nodejs",
  "React Native": "react-native",
  "Ruby on Rails": "ruby-on-rails",
  "Vue.js": "vuejs",
  "Next.js": "nextjs",
};

const KEYWORD_DESLUG_MAP = Object.fromEntries(
  Object.entries(KEYWORD_SLUG_MAP).map(([k, v]) => [v, k]),
);

export function slugifyKeyword(name: string): string {
  if (KEYWORD_SLUG_MAP[name]) return KEYWORD_SLUG_MAP[name];
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function deslugifyKeyword(slug: string): string {
  if (KEYWORD_DESLUG_MAP[slug]) return KEYWORD_DESLUG_MAP[slug];
  return slug.replace(/-/g, " ");
}
