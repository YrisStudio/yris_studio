"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { saveTariffs, type SettingsState } from "./actions";
import { quoteMaterials, type Tariffs } from "@/lib/pricing";

const field =
  "w-full rounded-md border border-line bg-bg/60 py-1.5 pl-2.5 pr-12 text-right font-mono text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";
const eur = (cents: number) => String(cents / 100).replace(".", ",");

function Field({ name, label, value, unit, hint }: { name: string; label: string; value: string; unit: string; hint?: string }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-[12px] text-fg/85">
        {label}
      </label>
      <div className="relative">
        <input id={name} name={name} inputMode="decimal" defaultValue={value} className={field} />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11.5px] text-muted">{unit}</span>
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export default function TariffsForm({ tariffs }: { tariffs: Tariffs }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveTariffs, { status: "idle" });

  return (
    <form action={action}>
      <p className="mb-2 text-[11.5px] font-medium text-muted">Prix d&apos;achat du filament</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {quoteMaterials.map((m) => (
          <Field key={m} name={`mat_${m}`} label={m} value={eur(tariffs.materials[m])} unit="€/kg" />
        ))}
      </div>

      <p className="mb-2 mt-5 text-[11.5px] font-medium text-muted">Coûts et marge</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field name="machine" label="Heure d'impression" value={eur(tariffs.machineHourCents)} unit="€/h" hint="Électricité + usure de la Bambu Lab." />
        <Field name="labor" label="Heure de main-d'œuvre" value={eur(tariffs.laborHourCents)} unit="€/h" hint="Préparation, finition, emballage." />
        <Field name="margin" label="Marge" value={String(tariffs.marginPct)} unit="%" hint="Ajoutée au coût de revient." />
        <Field name="waste" label="Filament perdu" value={String(tariffs.wastePct)} unit="%" hint="Purge, supports, ratés." />
        <Field name="minimum" label="Minimum de commande" value={eur(tariffs.minimumCents)} unit="€" hint="Hors livraison." />
        <Field name="shipping" label="Livraison" value={eur(tariffs.shippingCents)} unit="€" hint="Forfait ajouté au devis." />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-[13px] font-medium text-on-accent transition hover:brightness-110 disabled:opacity-60"
        >
          {pending && <LoaderCircle size={13} className="animate-spin" aria-hidden />}
          Enregistrer les tarifs
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
