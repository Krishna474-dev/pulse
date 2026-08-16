import Link from "next/link";

import { ChevronRight } from "@/components/ChevronRight";
import { cx } from "@/lib/format";
import { BrandService } from "@/services/brand.service";

export const dynamic = "force-dynamic";

/** NPS ranges from -100 to 100; colour follows the sign, not the brand. */
function NpsBadge({ nps, empty }: { nps: number; empty: boolean }) {
  if (empty) return <span className="text-lg text-slate-300">—</span>;

  return (
    <span
      className={cx(
        "inline-flex min-w-[3rem] justify-center rounded-lg px-2 py-1 text-base font-semibold tabular-nums",
        nps > 0 && "bg-emerald-50 text-emerald-700",
        nps === 0 && "bg-slate-100 text-slate-600",
        nps < 0 && "bg-rose-50 text-rose-700",
      )}
    >
      {nps > 0 ? `+${nps}` : nps}
    </span>
  );
}

export default async function BrandsPage() {
  const brands = await BrandService.listWithStats();

  if (brands.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-xl text-brand-600">
          ◎
        </div>
        <h2 className="mt-4 text-base font-semibold text-slate-900">No brands yet</h2>
        <p className="mt-1 text-sm text-slate-600">
          Run <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">npm run db:seed</code>{" "}
          to load the demo data.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Brands</h1>
      <p className="mt-1 text-sm text-slate-600">
        Headline score is the most recent wave for each brand.
      </p>

      <div className="card card-interactive mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="border-b border-slate-200/80 bg-slate-50/60">
              <tr className="section-title">
                <th className="px-5 py-3">Brand</th>
                <th className="px-5 py-3">Latest wave</th>
                <th className="px-5 py-3">NPS</th>
                <th className="px-5 py-3">Responses</th>
                <th className="px-5 py-3">Customers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {brands.map((brand) => (
                <tr key={brand.id} className="group transition-colors hover:bg-brand-50/40">
                  <td className="px-5 py-4">
                    <Link
                      href={`/brands/${brand.slug}`}
                      className="inline-flex items-center gap-1 font-medium text-slate-900
                        transition-colors group-hover:text-brand-700"
                    >
                      {brand.name}
                      <ChevronRight className="text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
                    </Link>
                    <div className="mt-0.5 text-xs text-slate-500">{brand.waveCount} waves</div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{brand.latestWave?.label ?? "—"}</td>
                  <td className="px-5 py-4">
                    <NpsBadge nps={brand.summary.nps} empty={brand.summary.total === 0} />
                  </td>
                  <td className="px-5 py-4 tabular-nums text-slate-600">{brand.summary.total}</td>
                  <td className="px-5 py-4 text-slate-600">
                    <span className="tabular-nums font-medium text-slate-900">
                      {brand.activeCustomers}
                    </span>
                    <span className="tabular-nums text-slate-400"> / {brand.customerCount}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
