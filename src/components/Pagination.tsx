"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function Pagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const goTo = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
      <span>
        {from}–{to} of {total}
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => goTo(page - 1)}
          className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="tabular-nums">
          Page {page} of {lastPage}
        </span>
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => goTo(page + 1)}
          className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
