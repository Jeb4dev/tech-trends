import Link from "next/link";
import { getAllCategories } from "@/lib/categories";

export default function SiteFooter() {
  const categories = getAllCategories();

  return (
    <footer className="border-t border-gray-700/50 bg-slate-900/60 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-lg font-bold text-green-400">
              Koodaripula
            </Link>
            <p className="text-sm text-gray-400 mt-2">
              Suomen IT-alan työmarkkinatrendit reaaliajassa.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-3">Kategoriat</h3>
            <ul className="space-y-1.5">
              {categories.slice(0, 5).map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/trends/${c.slug}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {c.nameFi}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-3">&nbsp;</h3>
            <ul className="space-y-1.5">
              {categories.slice(5).map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/trends/${c.slug}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {c.nameFi}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-3">Linkit</h3>
            <ul className="space-y-1.5">
              <li>
                <Link href="/trends" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Trendit
                </Link>
              </li>
              <li>
                <Link href="/advanced-search" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Haku
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Tietoa palvelusta
                </Link>
              </li>
            </ul>

            <h3 className="text-sm font-semibold text-gray-200 mb-3 mt-6">Palaute</h3>
            <ul className="space-y-1.5">
              <li>
                <a
                  href="https://tally.so/r/GxBzGO"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Puuttuuko avainsana?
                </a>
              </li>
              <li>
                <a
                  href="https://tally.so/r/GxBzGO"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Ehdota ominaisuutta
                </a>
              </li>
            </ul>

            <h3 className="text-sm font-semibold text-gray-200 mb-3 mt-6">Tulossa</h3>
            <ul className="space-y-1.5">
              <li>
                <Link href="/coming-soon/profile" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Oma profiili
                </Link>
              </li>
              <li>
                <Link href="/coming-soon/match" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Työpaikkaehdotukset
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-700/50 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-gray-500">
            Datalähde:{" "}
            <a href="https://duunitori.fi" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
              Duunitori.fi
            </a>
          </p>
          <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} Koodaripula</p>
        </div>
      </div>
    </footer>
  );
}
