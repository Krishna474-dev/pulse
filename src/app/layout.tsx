import type { Metadata } from "next";
import Link from "next/link";

import { ChevronRight } from "@/components/ChevronRight";
import { NavLink } from "@/components/NavLink";

import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse",
  description: "Customer feedback dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
            focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-popover"
        >
          Skip to content
        </a>

        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
            <Link
              href="/brands"
              className="group flex items-center gap-2 rounded-lg px-1 py-1 transition-colors"
            >
              <span
                aria-hidden
                className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm
                  font-bold text-white shadow-card transition-transform group-hover:scale-105"
              >
                P
              </span>
              <span
                className="text-base font-semibold tracking-tight text-slate-900
                  group-hover:text-brand-700"
              >
                Pulse
              </span>
            </Link>

            <ChevronRight />

            <nav className="flex items-center gap-1" aria-label="Main">
              <NavLink href="/brands">Brands</NavLink>
            </nav>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
