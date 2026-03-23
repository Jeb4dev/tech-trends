import Link from "next/link";
import {
  Code, Layers, Database, Cloud, GitBranch, BrainCircuit,
  Shield, Users, Briefcase, MapPin,
} from "lucide-react";
import type { CategoryInfo } from "@/lib/categories";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Code, Layers, Database, Cloud, GitBranch, BrainCircuit,
  Shield, Users, Briefcase, MapPin,
};

interface CategoryCardProps {
  category: CategoryInfo;
  totalJobs: number;
  topKeywords: { name: string; count: number }[];
}

export default function CategoryCard({ category, totalJobs, topKeywords }: CategoryCardProps) {
  const Icon = ICONS[category.icon] || Code;

  return (
    <Link
      href={`/trends/${category.slug}`}
      className="group relative overflow-hidden rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 p-5 hover:border-green-500/40 hover:from-gray-800/80 hover:to-gray-900/80 transition-all duration-300"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/[0.03] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-green-500/[0.08] transition-colors duration-300" />
      <div className="flex items-center gap-2.5 mb-3">
        <div className="p-1.5 rounded-lg bg-green-500/10">
          <Icon className="w-4 h-4 text-green-400" />
        </div>
        <span className="text-sm font-semibold text-gray-100 group-hover:text-white transition-colors">
          {category.nameFi}
        </span>
      </div>
      <div className="text-xs text-gray-500 mb-3">
        {totalJobs.toLocaleString("fi-FI")} työpaikkaa
      </div>
      <div className="flex flex-wrap gap-1.5">
        {topKeywords.map((kw) => (
          <span
            key={kw.name}
            className="inline-block px-2 py-0.5 text-[11px] rounded-md bg-gray-700/50 text-gray-300"
          >
            {kw.name}
          </span>
        ))}
      </div>
    </Link>
  );
}
