"use client";

import { useActionState } from "react";

import { addCustomer, type AddCustomerState } from "@/actions/customers";

const initialState: AddCustomerState = null;

export function AddCustomerForm({ brandId, brandSlug }: { brandId: string; brandSlug: string }) {
  const [state, formAction, pending] = useActionState(addCustomer, initialState);

  return (
    <form action={formAction} className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-medium text-slate-500">Add customer</h2>

      <input type="hidden" name="brandId" value={brandId} />
      <input type="hidden" name="brandSlug" value={brandSlug} />

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="name" className="block text-sm text-slate-600">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm text-slate-600">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            placeholder="+919876543210"
            required
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {state && state.success === false ? (
        <p className="mt-3 text-sm text-rose-600">{state.error.message}</p>
      ) : null}

      {state && state.success ? (
        <p className="mt-3 text-sm text-emerald-600">Customer added.</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add customer"}
      </button>
    </form>
  );
}
