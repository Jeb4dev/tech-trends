"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Etusivu" },
  { href: "/trends", label: "Trendit" },
  { href: "/advanced-search", label: "Haku" },
  { href: "/cv-analyysi", label: "CV-analyysi" },
  { href: "/chat", label: "Chat" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-700/50 bg-slate-900/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="text-lg font-bold text-green-400 hover:text-green-300 transition-colors">
            Koodaripula
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "px-3 py-1.5 text-sm rounded-md transition-colors " +
                    (active
                      ? "bg-green-500/15 text-green-300"
                      : "text-gray-300 hover:text-white hover:bg-gray-800/60")
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="sm:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setOpen(!open)}
            aria-label="Valikko"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden border-t border-gray-700/50 bg-slate-900/95 px-4 py-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={
                  "block px-3 py-2 text-sm rounded-md transition-colors " +
                  (active
                    ? "bg-green-500/15 text-green-300"
                    : "text-gray-300 hover:text-white hover:bg-gray-800/60")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
