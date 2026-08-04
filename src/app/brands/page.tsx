import Link from "next/link";

import { BrandService } from "@/services/brand.service";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const brands = await BrandService.listWithStats();

  if (brands.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-600">
        No brands yet. Run <code className="font-mono text-sm">npm run db:seed</code>.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
      <p className="mt-1 text-sm text-slate-600">
        Headline score is the most recent wave for each brand.
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Brand</th>
              <th className="px-4 py-3 font-medium">Latest wave</th>
              <th className="px-4 py-3 font-medium">NPS</th>
              <th className="px-4 py-3 font-medium">Responses</th>
              <th className="px-4 py-3 font-medium">Customers</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/brands/${brand.slug}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {brand.name}
                  </Link>
                  <div className="text-xs text-slate-500">{brand.waveCount} waves</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{brand.latestWave?.label ?? "—"}</td>
                <td className="px-4 py-3 text-lg font-semibold tabular-nums">
                  {brand.summary.total === 0 ? "—" : brand.summary.nps}
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-600">{brand.summary.total}</td>
                <td className="px-4 py-3 tabular-nums text-slate-600">
                  {brand.activeCustomers} / {brand.customerCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
