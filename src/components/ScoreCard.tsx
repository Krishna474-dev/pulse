import { percentage, type Summary } from "@/lib/nps";
import { cx } from "@/lib/format";

function Stat({
  label,
  count,
  total,
  dot,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  dot: string;
  tone: string;
}) {
  return (
    <div className="flex-1">
      <div className="flex items-center gap-1.5">
        <span aria-hidden className={cx("h-2 w-2 rounded-full", dot)} />
        <span className="section-title">{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className={cx("text-xl font-semibold tabular-nums", tone)}>{count}</span>
        <span className="text-sm text-slate-500 tabular-nums">{percentage(count, total)}</span>
      </div>
    </div>
  );
}

export function ScoreCard({ summary }: { summary: Summary }) {
  if (summary.total === 0) {
    return (
      <section className="card p-6">
        <h2 className="section-title">Net Promoter Score</h2>
        <div className="mt-6 flex flex-col items-center py-6 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-xl text-slate-400">
            ◔
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700">No feedback yet for this wave</p>
          <p className="mt-1 text-sm text-slate-500">
            Responses will appear here as customers reply.
          </p>
        </div>
      </section>
    );
  }

  const share = (count: number) => `${(count / summary.total) * 100}%`;

  return (
    <section className="card p-6">
      <h2 className="section-title">Net Promoter Score</h2>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={cx(
            "text-4xl font-semibold tabular-nums tracking-tight",
            summary.nps > 0 && "text-emerald-600",
            summary.nps === 0 && "text-slate-900",
            summary.nps < 0 && "text-rose-600",
          )}
        >
          {summary.nps > 0 ? `+${summary.nps}` : summary.nps}
        </span>
        <span className="text-sm text-slate-500">
          from <span className="font-medium text-slate-700 tabular-nums">{summary.total}</span>{" "}
          responses
        </span>
      </div>

      {/* Distribution bar: the shape of the wave in one glance. */}
      <div
        className="mt-5 flex h-2 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`${summary.promoters} promoters, ${summary.passives} passives, ${summary.detractors} detractors`}
      >
        <div className="bg-emerald-500" style={{ width: share(summary.promoters) }} />
        <div className="bg-amber-400" style={{ width: share(summary.passives) }} />
        <div className="bg-rose-500" style={{ width: share(summary.detractors) }} />
      </div>

      <div className="mt-5 flex gap-6 border-t border-slate-100 pt-4">
        <Stat
          label="Promoters"
          count={summary.promoters}
          total={summary.total}
          dot="bg-emerald-500"
          tone="text-emerald-600"
        />
        <Stat
          label="Passives"
          count={summary.passives}
          total={summary.total}
          dot="bg-amber-400"
          tone="text-amber-600"
        />
        <Stat
          label="Detractors"
          count={summary.detractors}
          total={summary.total}
          dot="bg-rose-500"
          tone="text-rose-600"
        />
      </div>
    </section>
  );
}
