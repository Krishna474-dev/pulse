"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function Pagination({
  page,
  pageSize,
  total,
  param = "page",
  label = "rows",
}: {
  page: number;
  pageSize: number;
  total: number;
  /** Which search param this pager drives, so two lists can page independently. */
  param?: string;
  label?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const goTo = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(param, String(nextPage));
    // `scroll: false` keeps the reader where they were; paging to the top of the
    // page would lose the table they are reading, especially the lower section.
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-600">
      <span className="tabular-nums">
        <span className="font-medium text-slate-900">
          {from}–{to}
        </span>{" "}
        of <span className="font-medium text-slate-900">{total}</span>
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => goTo(page - 1)}
          aria-label={`Previous page of ${label}`}
          className="btn-ghost px-2.5 py-1.5"
        >
          ← Previous
        </button>
        <span className="tabular-nums px-1 text-slate-500">
          Page <span className="font-medium text-slate-900">{page}</span> of {lastPage}
        </span>
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => goTo(page + 1)}
          aria-label={`Next page of ${label}`}
          className="btn-ghost px-2.5 py-1.5"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
