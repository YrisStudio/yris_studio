"use client";

import { useActionState, useRef } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { addSpool, type StockState } from "./actions";
import { filamentMaterials } from "@/lib/site";

const field =
  "w-full rounded-lg border border-line-strong bg-panel-2 px-3 py-2 text-sm text-fg outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15";
const label = "mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted";

export default function AddSpoolForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<StockState, FormData>(async (prev, fd) => {
    const res = await addSpool(prev, fd);
    if (res.status === "success") formRef.current?.reset();
    return res;
  }, { status: "idle" });

  return (
    <form ref={formRef} action={action} className="rounded-2xl border border-line bg-panel p-5">
      <p className="font-medium">Ajouter une bobine</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[120px_1fr_70px_110px_110px_auto] lg:items-end">
        <div>
          <label htmlFor="material" className={label}>Matériau</label>
          <select id="material" name="material" defaultValue="PLA" className={field}>
            {filamentMaterials.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="color" className={label}>Couleur</label>
          <input id="color" name="color" placeholder="Noir mat" maxLength={40} className={field} />
        </div>
        <div>
          <label htmlFor="color_hex" className={label}>Teinte</label>
          <input id="color_hex" name="color_hex" type="color" defaultValue="#1d1d1f" className="h-[38px] w-full cursor-pointer rounded-lg border border-line-strong bg-panel-2 p-1" />
        </div>
        <div>
          <label htmlFor="spool_grams" className={label}>Bobine (g)</label>
          <input id="spool_grams" name="spool_grams" type="number" min={1} defaultValue={1000} className={field} />
        </div>
        <div>
          <label htmlFor="alert_grams" className={label}>Alerte sous (g)</label>
          <input id="alert_grams" name="alert_grams" type="number" min={0} defaultValue={200} className={field} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-[38px] items-center justify-center gap-1.5 rounded-lg bg-fg px-4 text-sm font-medium text-bg transition hover:opacity-85 disabled:opacity-60"
        >
          {pending ? <LoaderCircle size={15} className="animate-spin" aria-hidden /> : <Plus size={15} aria-hidden />}
          Ajouter
        </button>
      </div>
      {state.message && (
        <p role="status" className={`mt-3 text-sm ${state.status === "error" ? "text-red-600" : "text-emerald-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
