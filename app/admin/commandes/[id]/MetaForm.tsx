"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { updateOrderMeta, type ActionState } from "../actions";

const field =
  "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";
const label = "mb-1 block text-[11.5px] text-muted";

// Priorité, date promise au client et prix final (si on ne passe pas par le générateur).
export default function MetaForm({
  id,
  priority,
  dueDate,
  finalCents,
}: {
  id: string;
  priority: string;
  dueDate: string | null;
  finalCents: number | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateOrderMeta.bind(null, id), { status: "idle" });

  return (
    <form action={action} className="space-y-3">
      <div>
        <span className={label}>Priorité</span>
        <div className="grid grid-cols-2 gap-1 rounded-md border border-line bg-bg/60 p-0.5 text-[12.5px]">
          {(["normale", "urgente"] as const).map((p) => (
            <label key={p} className="cursor-pointer">
              <input type="radio" name="priority" value={p} defaultChecked={priority === p} className="peer sr-only" />
              <span
                className={`block rounded px-2 py-1 text-center text-muted transition peer-checked:text-fg peer-focus-visible:ring-1 peer-focus-visible:ring-accent ${
                  p === "urgente" ? "peer-checked:bg-red-400/15 peer-checked:text-red-300" : "peer-checked:bg-fg/10"
                }`}
              >
                {p === "normale" ? "Normale" : "Urgente"}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="due_date" className={label}>
          Date promise au client
        </label>
        <input id="due_date" name="due_date" type="date" defaultValue={dueDate ?? ""} className={`${field} [color-scheme:dark]`} />
      </div>
      <div>
        <label htmlFor="final_price" className={label}>
          Prix final (€)
        </label>
        <input
          id="final_price"
          name="final_price"
          inputMode="decimal"
          placeholder="Calculé par le devis"
          defaultValue={finalCents !== null ? String(finalCents / 100).replace(".", ",") : ""}
          className={field}
        />
      </div>
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
