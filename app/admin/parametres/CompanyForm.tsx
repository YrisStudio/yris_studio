"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { saveCompany, type SettingsState } from "./actions";
import { companyFields, type Company } from "@/lib/company";

const field =
  "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition placeholder:text-muted/50 focus:border-accent sm:text-[13px]";

// Infos qui apparaîtront sur les devis et factures (mentions obligatoires comprises).
export default function CompanyForm({ company }: { company: Company }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveCompany, { status: "idle" });

  return (
    <form action={action}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {companyFields.map((f) => (
          <div key={f.key}>
            <label htmlFor={`co-${f.key}`} className="mb-1 block text-[12px] text-fg/85">
              {f.label}
            </label>
            <input id={`co-${f.key}`} name={f.key} defaultValue={company[f.key]} placeholder={f.placeholder} maxLength={200} className={field} />
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-[13px] font-medium text-on-accent transition hover:brightness-110 disabled:opacity-60"
        >
          {pending && <LoaderCircle size={13} className="animate-spin" aria-hidden />}
          Enregistrer les infos
        </button>
        {state.message && (
          <p role="status" className={`text-[12.5px] ${state.status === "error" ? "text-red-300" : "text-accent"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
