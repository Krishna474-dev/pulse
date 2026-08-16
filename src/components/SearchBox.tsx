"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function SearchBox({
  current,
  param = "q",
  pageParam = "page",
  placeholder = "Search comments or customers",
  label = "Search comments or customer names",
}: {
  current: string;
  /** Which search param this box drives, so two lists can search independently. */
  param?: string;
  pageParam?: string;
  placeholder?: string;
  label?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(current);

  // Keep in step when the URL changes elsewhere (back button, clearing a filter).
  useEffect(() => setValue(current), [current]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set(param, value.trim());
    } else {
      params.delete(param);
    }
    params.set(pageParam, "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const clear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(param);
    params.set(pageParam, "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <div className="relative">
        <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          ⌕
        </span>
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className="input w-full pl-8 sm:w-64"
        />
      </div>
      <button type="submit" className="btn-primary">
        Search
      </button>
      {current ? (
        <button type="button" onClick={clear} className="btn-ghost">
          Clear
        </button>
      ) : null}
    </form>
  );
}
