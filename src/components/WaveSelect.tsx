"use client";

import { useRouter, useSearchParams } from "next/navigation";

type WaveOption = {
  id: string;
  label: string;
};

export function WaveSelect({ waves, currentId }: { waves: WaveOption[]; currentId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onChange = (waveId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("wave", waveId);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span>Wave</span>
      <select
        value={currentId}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900"
      >
        {waves.map((wave) => (
          <option key={wave.id} value={wave.id}>
            {wave.label}
          </option>
        ))}
      </select>
    </label>
  );
}
