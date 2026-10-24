"use client";

import { useActionState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { updateOrder, type OrderEditState } from "./actions";
import { orderStatuses } from "@/lib/site";

const field =
  "w-full rounded-lg border border-line-strong bg-panel-2 px-3 py-2 text-sm text-fg outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15";
const label = "mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted";

export default function OrderEditor({
  id,
  status,
  finalCents,
  note,
}: {
  id: string;
  status: string;
  finalCents: number | null;
  note: string | null;
}) {
  const [state, action, pending] = useActionState<OrderEditState, FormData>(updateOrder.bind(null, id), {
    status: "idle",
  });

  return (
    <form action={action} className="space-y-3 rounded-xl border border-line bg-panel-2 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`status-${id}`} className={label}>Statut</label>
          <select id={`status-${id}`} name="status" defaultValue={status} className={field}>
            {orderStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`price-${id}`} className={label}>Prix final (€)</label>
          <input
            id={`price-${id}`}
            name="final_price"
            inputMode="decimal"
            placeholder="24,90"
            defaultValue={finalCents !== null ? (finalCents / 100).toFixed(2).replace(".", ",") : ""}
            className={field}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`note-${id}`} className={label}>Note interne</label>
        <textarea id={`note-${id}`} name="admin_note" rows={2} defaultValue={note ?? ""} placeholder="Visible par vous seul" className={`${field} resize-y`} />
      </div>
      <div className="flex items-center justify-end gap-3">
        {state.message && (
          <span role="status" className={`flex items-center gap-1 text-xs ${state.status === "error" ? "text-red-600" : "text-emerald-600"}`}>
            {state.status === "success" && <Check size={13} aria-hidden />}
            {state.message}
          </span>
        )}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-fg px-4 py-2 text-sm font-medium text-bg transition hover:opacity-85 disabled:opacity-60"
        >
          {pending && <LoaderCircle size={14} className="animate-spin" aria-hidden />}
          Enregistrer
        </button>
      </div>
    </form>
  );
}
