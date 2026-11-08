"use client";

import { useActionState, useRef } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { addTodo, type TodoState } from "./actions";
import { priorities, todoCategories } from "@/lib/todos";

const field =
  "w-full rounded-lg border border-line-strong bg-panel-2 px-3 py-2.5 text-base text-fg outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 sm:text-sm";
const label = "mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted";

// Formulaire d'ajout, pensé pour le téléphone (champs en 16 px pour éviter le zoom automatique).
export default function AddTodoForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<TodoState, FormData>(
    async (prev, fd) => {
      const res = await addTodo(prev, fd);
      if (res.status === "success") formRef.current?.reset();
      return res;
    },
    { status: "idle" },
  );

  return (
    <form ref={formRef} action={action} className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
      <label htmlFor="title" className="font-medium">
        Ajouter une tâche
      </label>
      <input id="title" name="title" required maxLength={200} placeholder="Ex. Filmer le timelapse du support de phare" className={`${field} mt-3`} />
      <textarea
        name="details"
        rows={2}
        maxLength={2000}
        placeholder="Détails (facultatif)"
        aria-label="Détails"
        className={`${field} mt-2 resize-y`}
      />
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="category" className={label}>Catégorie</label>
          <select id="category" name="category" defaultValue="Réseaux sociaux" className={field}>
            {todoCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="priority" className={label}>Priorité</label>
          <select id="priority" name="priority" defaultValue="2" className={field}>
            {priorities.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="col-span-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-accent px-5 text-sm font-medium text-on-accent transition hover:brightness-110 disabled:opacity-60 sm:col-span-1 sm:h-[42px]"
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
