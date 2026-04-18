import Link from "next/link";
import { User, Sparkles, Target, FileText } from "lucide-react";

interface ComingSoonFeature {
  slug: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  status: "available" | "soon";
}

const FEATURES: ComingSoonFeature[] = [
  {
    slug: "match",
    title: "Työpaikkaehdotukset",
    description: "Tekoäly suosittelee sopivia rooleja CV:si ja markkinadatan pohjalta.",
    icon: Sparkles,
    href: "/cv-analyysi",
    status: "available",
  },
  {
    slug: "skill-gaps",
    title: "Osaamisvaje-analyysi",
    description: "Vertaa CV:tä työpaikkailmoitukseen — näet mitä puuttuu ja mitä oppia.",
    icon: Target,
    href: "/cv-analyysi",
    status: "available",
  },
  {
    slug: "applications",
    title: "Saatekirjeet ja CV-apu",
    description: "Luo räätälöity saatekirje ja parempi profiilitiivistelmä ilmoitukseen.",
    icon: FileText,
    href: "/cv-analyysi",
    status: "available",
  },
  {
    slug: "profile",
    title: "Oma profiili",
    description: "Tallenna osaamisesi ja seuraa kysyntää — tulossa käyttäjätilin kanssa.",
    icon: User,
    href: "/coming-soon/profile",
    status: "soon",
  },
];

export default function ComingSoonBanner() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {FEATURES.map((feature) => {
        const Icon = feature.icon;
        const available = feature.status === "available";
        return (
          <Link
            key={feature.slug}
            href={feature.href}
            className={
              "group relative overflow-hidden rounded-xl border p-5 transition-all duration-300 " +
              (available
                ? "border-green-500/30 bg-gradient-to-br from-green-500/5 to-gray-800/30 hover:border-green-500/50 hover:bg-gray-800/50"
                : "border-dashed border-gray-700/60 bg-gray-800/30 hover:border-green-500/30 hover:bg-gray-800/50")
            }
          >
            <div className="flex items-start gap-3 mb-2">
              <div
                className={
                  "p-1.5 rounded-lg transition-colors " +
                  (available ? "bg-green-500/15" : "bg-gray-700/50 group-hover:bg-green-500/10")
                }
              >
                <Icon
                  className={
                    "w-4 h-4 transition-colors " +
                    (available ? "text-green-300" : "text-gray-400 group-hover:text-green-400")
                  }
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                    {feature.title}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{feature.description}</p>
              </div>
            </div>
            <span
              className={
                "absolute top-3 right-3 px-1.5 py-0.5 text-[10px] font-medium rounded border " +
                (available
                  ? "bg-green-500/15 text-green-300 border-green-500/30"
                  : "bg-green-500/10 text-green-500/70 border-green-500/20")
              }
            >
              {available ? "Saatavilla" : "Tulossa"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
