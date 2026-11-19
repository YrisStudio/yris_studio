"use client";

import { useActionState, useRef } from "react";
import { LoaderCircle } from "lucide-react";
import { addOrderNote, type ActionState } from "../actions";

// Note interne : visible seulement dans le gestionnaire.
export default function NoteForm({ id }: { id: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const res = await addOrderNote(id, prev, fd);
    if (res.status === "success") ref.current?.reset();
    return res;
  }, { status: "idle" });

  return (
    <form ref={ref} action={action}>
      <label htmlFor={`note-${id}`} className="sr-only">
        Ajouter une note interne
      </label>
      <textarea
        id={`note-${id}`}
        name="note"
        rows={2}
        maxLength={4000}
        placeholder="Note interne (le client ne la voit pas)…"
        className="w-full resize-y rounded-md border border-line bg-bg/60 px-2.5 py-2 text-base text-fg outline-none transition placeholder:text-muted/70 focus:border-accent sm:text-[13px]"
      />
      <div className="mt-1.5 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1 text-[12.5px] transition hover:bg-fg/5 disabled:opacity-60"
        >
          {pending && <LoaderCircle size={12} className="animate-spin" aria-hidden />}
          Ajouter la note
        </button>
        {state.status === "error" && <p className="text-[12px] text-red-300">{state.message}</p>}
      </div>
    </form>
  );
}
