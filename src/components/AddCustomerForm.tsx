"use client";

import { useActionState, useEffect, useState } from "react";

import { addCustomer, type AddCustomerState } from "@/actions/customers";
import { cx } from "@/lib/format";

const initialState: AddCustomerState = null;

export function AddCustomerForm({ brandId, brandSlug }: { brandId: string; brandSlug: string }) {
  const [state, formAction, pending] = useActionState(addCustomer, initialState);

  // React resets an uncontrolled form once the action returns, which would discard
  // everything typed whenever validation fails. Holding the values here keeps them.
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (state?.success) {
      setName("");
      setPhone("");
    }
  }, [state]);

  const fieldError = (field: string) =>
    state && state.success === false ? state.error.fields?.[field] : undefined;

  const nameError = fieldError("name");
  const phoneError = fieldError("phone");

  return (
    <form action={formAction} className="card p-6">
      <h2 className="section-title">Add customer</h2>

      <input type="hidden" name="brandId" value={brandId} />
      <input type="hidden" name="brandSlug" value={brandSlug} />

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="name" className="label">
            Name
          </label>
          <input
            id="name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={80}
            autoComplete="name"
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? "name-error" : undefined}
            className={cx("input mt-1", nameError && "border-rose-300 focus:ring-rose-500/20")}
          />
          {nameError ? (
            <p id="name-error" className="mt-1 text-xs text-rose-600">
              {nameError}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="phone" className="label">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+919876543210"
            required
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={Boolean(phoneError)}
            aria-describedby={phoneError ? "phone-error" : "phone-hint"}
            className={cx("input mt-1", phoneError && "border-rose-300 focus:ring-rose-500/20")}
          />
          {phoneError ? (
            <p id="phone-error" className="mt-1 text-xs text-rose-600">
              {phoneError}
            </p>
          ) : (
            <p id="phone-hint" className="mt-1 text-xs text-slate-500">
              Country code required. Spaces and dashes are fine.
            </p>
          )}
        </div>
      </div>

      {state && state.success === false ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          <span aria-hidden>⚠</span>
          {state.error.message}
        </p>
      ) : null}

      {state && state.success ? (
        <p
          role="status"
          className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          <span aria-hidden>✓</span>
          Customer added.
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary mt-4 w-full">
        {pending ? (
          <>
            <span
              aria-hidden
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
            Adding…
          </>
        ) : (
          "Add customer"
        )}
      </button>
    </form>
  );
}
