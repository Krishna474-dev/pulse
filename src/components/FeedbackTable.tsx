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
      aria-sort={active ? (currentDir === "asc" ? "ascending" : "descending") : "none"}
      title={`Sort by ${label.toLowerCase()}, ${nextDir === "asc" ? "ascending" : "descending"}`}
      className={cx("hover:text-slate-900", active ? "text-slate-900 underline" : "text-slate-500")}
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
      <div className="px-4 py-10 text-center text-sm text-slate-500">
        No comments match these filters.
      </div>
    );
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
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
      <tbody>
        {rows.map((row) => {
          const bucket = bucketForScore(row.score);

          return (
            <tr key={row.id} className="border-b border-slate-50 last:border-0 align-top">
              <td className="px-4 py-3 whitespace-nowrap text-slate-700">{row.customerName}</td>
              <td className="px-4 py-3">
                <span
                  className={cx(
                    "inline-flex h-6 w-6 items-center justify-center rounded text-xs font-semibold tabular-nums",
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
  );
}
