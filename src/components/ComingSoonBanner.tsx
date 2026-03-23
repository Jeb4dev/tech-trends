import Link from "next/link";
import { User, Sparkles, Target, FileText } from "lucide-react";

interface ComingSoonFeature {
  slug: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FEATURES: ComingSoonFeature[] = [
  {
    slug: "profile",
    title: "Oma profiili",
    description: "Lisää osaamisesi ja kokemuksesi.",
    icon: User,
  },
  {
    slug: "match",
    title: "Työpaikkaehdotukset",
    description: "Tekoäly suosittelee sopivia työpaikkoja.",
    icon: Sparkles,
  },
  {
    slug: "skill-gaps",
    title: "Osaamisvaje-analyysi",
    description: "Tunnista kehityskohteet uraasi varten.",
    icon: Target,
  },
  {
    slug: "applications",
    title: "Hakemusten hallinta",
    description: "Luo saatekirjeitä ja hallitse hakemuksiasi.",
    icon: FileText,
  },
];

export default function ComingSoonBanner() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {FEATURES.map((feature) => {
        const Icon = feature.icon;
        return (
          <Link
            key={feature.slug}
            href={`/coming-soon/${feature.slug}`}
            className="group relative overflow-hidden rounded-xl border border-dashed border-gray-700/60 bg-gray-800/30 p-5 hover:border-green-500/30 hover:bg-gray-800/50 transition-all duration-300"
          >
            <div className="flex items-start gap-3 mb-2">
              <div className="p-1.5 rounded-lg bg-gray-700/50 group-hover:bg-green-500/10 transition-colors">
                <Icon className="w-4 h-4 text-gray-400 group-hover:text-green-400 transition-colors" />
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
            <span className="absolute top-3 right-3 px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-500/10 text-green-500/70 border border-green-500/20">
              Tulossa
            </span>
          </Link>
        );
      })}
    </div>
  );
}
