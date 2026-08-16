import Link from "next/link";

import { FlagButton } from "@/components/FlagButton";
import { formatDateTime, cx } from "@/lib/format";
import { bucketForScore } from "@/lib/nps";
import type { FeedbackRow, SortDir, SortKey } from "@/services/response.service";

const TONE: Record<string, string> = {
  promoter: "bg-emerald-50 text-emerald-700",
  passive: "bg-amber-50 text-amber-700",
  detractor: "bg-rose-50 text-rose-700",
};

function SortLink({
  label,
  sortKey,
  currentSort,
  currentDir,
  query,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  query: Record<string, string>;
}) {
  const active = currentSort === sortKey;
  // Clicking the active column flips it; clicking the other starts at descending.
  const nextDir: SortDir = active && currentDir === "desc" ? "asc" : "desc";
  const params = new URLSearchParams({ ...query, sort: sortKey, dir: nextDir, page: "1" });

  return (
    <Link
      href={`?${params.toString()}`}
      scroll={false}
      aria-sort={active ? (currentDir === "asc" ? "ascending" : "descending") : "none"}
      title={`Sort by ${label.toLowerCase()}, ${nextDir === "asc" ? "ascending" : "descending"}`}
      className={cx(
        "inline-flex items-center transition-colors hover:text-brand-700",
        active ? "text-brand-700" : "text-slate-500",
      )}
    >
      {label}
      <span aria-hidden className="ml-1 tabular-nums">
        {active ? (currentDir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </Link>
  );
}

export function FeedbackTable({
  rows,
  sort,
  dir,
  query,
  brandSlug,
}: {
  rows: FeedbackRow[];
  sort: SortKey;
  dir: SortDir;
  query: Record<string, string>;
  brandSlug: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 py-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-xl text-slate-400">
          ⌕
        </div>
        <p className="mt-3 text-sm font-medium text-slate-700">No comments match these filters</p>
        <p className="mt-1 text-sm text-slate-500">Try clearing the search or choosing All.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] text-left text-sm">
      <thead className="border-b border-slate-200/80 bg-slate-50/60 section-title">
        <tr>
          <th className="px-4 py-3 font-medium">Customer</th>
          <th className="px-4 py-3 font-medium">
            <SortLink
              label="Score"
              sortKey="score"
              currentSort={sort}
              currentDir={dir}
              query={query}
            />
          </th>
          <th className="px-4 py-3 font-medium">Comment</th>
          <th className="px-4 py-3 font-medium">
            <SortLink
              label="Received"
              sortKey="date"
              currentSort={sort}
              currentDir={dir}
              query={query}
            />
          </th>
          <th className="px-4 py-3 font-medium">Follow-up</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row) => {
          const bucket = bucketForScore(row.score);

          return (
            <tr
              key={row.id}
              className={cx(
                "align-top transition-colors hover:bg-slate-50/70",
                row.flaggedAt && "bg-amber-50/40",
              )}
            >
              <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                {row.customerName}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cx(
                    "inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold tabular-nums",
                    TONE[bucket],
                  )}
                >
                  {row.score}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-700">{row.verbatim}</td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                {formatDateTime(row.respondedAt)}
              </td>
              <td className="px-4 py-3">
                <FlagButton
                  responseId={row.id}
                  brandSlug={brandSlug}
                  flagged={Boolean(row.flaggedAt)}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
      </table>
    </div>
  );
}
