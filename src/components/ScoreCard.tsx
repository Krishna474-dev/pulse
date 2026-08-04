import { percentage, type Summary } from "@/lib/nps";
import { cx } from "@/lib/format";

function Stat({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: string;
}) {
  return (
    <div className="flex-1">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={cx("text-xl font-semibold", tone)}>{count}</span>
        <span className="text-sm text-slate-500">{percentage(count, total)}</span>
      </div>
    </div>
  );
}

export function ScoreCard({ summary }: { summary: Summary }) {
  if (summary.total === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-medium text-slate-500">Net Promoter Score</h2>
        <p className="mt-3 text-slate-600">No feedback yet for this wave.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-medium text-slate-500">Net Promoter Score</h2>

      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-4xl font-semibold tabular-nums">{summary.nps}</span>
        <span className="text-sm text-slate-500">from {summary.total} responses</span>
      </div>

      <div className="mt-6 flex gap-6 border-t border-slate-100 pt-4">
        <Stat label="Promoters" count={summary.promoters} total={summary.total} tone="text-emerald-600" />
        <Stat label="Passives" count={summary.passives} total={summary.total} tone="text-amber-600" />
        <Stat label="Detractors" count={summary.detractors} total={summary.total} tone="text-rose-600" />
      </div>
    </section>
  );
}
