"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { BUCKETS, type Bucket } from "@/lib/nps";
import { cx } from "@/lib/format";

const LABELS: Record<Bucket, string> = {
  all: "All",
  promoters: "Promoters",
  passives: "Passives",
  detractors: "Detractors",
};

export function BucketFilter({ current }: { current: Bucket }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onSelect = (next: Bucket) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("bucket", next);
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-card">
      {BUCKETS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          aria-pressed={current === option}
          className={cx(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            current === option
              ? "bg-brand-600 text-white shadow-card"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          )}
        >
          {LABELS[option]}
        </button>
      ))}
    </div>
  );
}
