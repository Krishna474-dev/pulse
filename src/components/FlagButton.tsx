"use client";

import { useActionState } from "react";

import { setResponseFlag, type SetFlagState } from "@/actions/responses";
import { cx } from "@/lib/format";

const initialState: SetFlagState = null;

export function FlagButton({
  responseId,
  brandSlug,
  flagged,
}: {
  responseId: string;
  brandSlug: string;
  flagged: boolean;
}) {
  const [state, formAction, pending] = useActionState(setResponseFlag, initialState);
  const failed = state !== null && state.success === false;

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="responseId" value={responseId} />
      <input type="hidden" name="brandSlug" value={brandSlug} />
      <input type="hidden" name="flagged" value={flagged ? "false" : "true"} />

      <button
        type="submit"
        disabled={pending}
        aria-pressed={flagged}
        title={flagged ? "Remove follow-up flag" : "Flag for follow-up"}
        className={cx(
          "rounded px-2 py-1 text-sm transition-colors disabled:opacity-40",
          flagged ? "bg-amber-100 text-amber-700" : "text-slate-400 hover:bg-slate-100",
        )}
      >
        {flagged ? "★" : "☆"}
        <span className="sr-only">{flagged ? "Flagged for follow-up" : "Not flagged"}</span>
      </button>

      {failed ? (
        <span className="text-xs text-rose-600" role="alert">
          {state.error.message}
        </span>
      ) : null}
    </form>
  );
}
