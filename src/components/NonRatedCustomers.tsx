import type { Customer } from "@prisma/client";
import Link from "next/link";

import { Pagination } from "@/components/Pagination";
import { SearchBox } from "@/components/SearchBox";
import { formatDate } from "@/lib/format";

export function NonRatedCustomers({
  rows,
  total,
  page,
  pageSize,
  search,
}: {
  rows: Customer[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
}) {
  return (
    <section className="card overflow-hidden">
      <header className="border-b border-slate-200/80 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Non-rated customers</h2>
              <span className="badge bg-brand-50 text-brand-700 tabular-nums">
                {total} {total === 1 ? "customer" : "customers"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Never responded to any wave — candidates for a rating request.
            </p>
          </div>

          <SearchBox
            current={search}
            param="cq"
            pageParam="cpage"
            placeholder="Search name or phone"
            label="Search non-rated customers by name or phone"
          />
        </div>
      </header>

      {total === 0 && search ? (
        <div className="flex flex-col items-center px-4 py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-xl text-slate-400">
            ⌕
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700">
            No non-rated customer matches “{search}”
          </p>
          <p className="mt-1 text-sm text-slate-500">Try part of a name or phone number.</p>
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center px-4 py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-xl text-emerald-600">
            ✓
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700">Everyone has rated</p>
          <p className="mt-1 text-sm text-slate-500">
            Every customer for this brand has responded at least once.
          </p>
        </div>
      ) : rows.length === 0 ? (
        /* Page number past the end — distinct from having nobody to show. */
        <div className="flex flex-col items-center px-4 py-16 text-center">
          <p className="text-sm font-medium text-slate-700">Nothing on this page</p>
          <p className="mt-1 text-sm text-slate-500">
            There are {total} non-rated customers in total.
          </p>
          <Link href="?cpage=1" className="btn-ghost mt-4">
            Back to first page
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/60 section-title">
                <tr>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((customer) => (
                  <tr key={customer.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-medium text-slate-700">{customer.name}</td>
                    <td className="px-5 py-3 tabular-nums text-slate-600">{customer.phone}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                      {formatDate(customer.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            param="cpage"
            label="non-rated customers"
          />
        </>
      )}
    </section>
  );
}
