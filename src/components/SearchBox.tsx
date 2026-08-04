"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBox({ current }: { current: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(current);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("q", value.trim());
    } else {
      params.delete("q");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search comments"
        className="w-64 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
      >
        Search
      </button>
    </form>
  );
}
