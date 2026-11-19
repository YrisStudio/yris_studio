"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { saveClient, type ClientState } from "../actions";

const field =
  "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";
const label = "mb-1 block text-[11.5px] text-muted";

export default function ClientForm({
  email,
  name,
  company,
  phone,
  isPro,
  discount,
}: {
  email: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  isPro: boolean;
  discount: number;
}) {
  const [state, action, pending] = useActionState<ClientState, FormData>(saveClient.bind(null, email), { status: "idle" });
  const [pro, setPro] = useState(isPro);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="c-name" className={label}>Nom</label>
        <input id="c-name" name="name" defaultValue={name ?? ""} maxLength={120} className={field} />
      </div>
      <div>
        <label htmlFor="c-company" className={label}>Société</label>
        <input id="c-company" name="company" defaultValue={company ?? ""} maxLength={120} placeholder="Garage Dupont" className={field} />
      </div>
      <div>
        <label htmlFor="c-phone" className={label}>Téléphone</label>
        <input id="c-phone" name="phone" type="tel" defaultValue={phone ?? ""} maxLength={40} className={field} />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-[13px]">
        <input type="checkbox" name="is_pro" checked={pro} onChange={(e) => setPro(e.target.checked)} className="accent-[var(--color-accent)]" />
        Client pro
      </label>
      {pro && (
        <div>
          <label htmlFor="c-discount" className={label}>Remise pro appliquée aux devis</label>
          <div className="relative">
            <input id="c-discount" name="pro_discount_pct" inputMode="decimal" defaultValue={discount ? String(discount).replace(".", ",") : ""} placeholder="0" className={`${field} pr-7`} />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11.5px] text-muted">%</span>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-fg px-3 py-1.5 text-[12.5px] font-medium text-bg transition hover:opacity-85 disabled:opacity-60"
        >
          {pending && <LoaderCircle size={13} className="animate-spin" aria-hidden />}
          Enregistrer
        </button>
        {state.message && (
          <p role="status" className={`text-[12px] ${state.status === "error" ? "text-red-300" : "text-accent"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
