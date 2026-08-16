"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/lib/format";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "text-slate-900" : "text-slate-500 hover:text-slate-900",
      )}
    >
      {children}
      {active ? (
        <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-brand-600" />
      ) : null}
    </Link>
  );
}
