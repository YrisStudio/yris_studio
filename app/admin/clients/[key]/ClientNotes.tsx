"use client";

import { useActionState, useRef, useTransition } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { addClientNote, deleteClientNote, type ClientState } from "../actions";
import type { ClientNote } from "@/lib/clients";

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

export default function ClientNotes({ email, notes }: { email: string; notes: ClientNote[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const [, start] = useTransition();
  const [state, action, pending] = useActionState<ClientState, FormData>(async (prev, fd) => {
    const res = await addClientNote(email, prev, fd);
    if (res.status === "success") ref.current?.reset();
    return res;
  }, { status: "idle" });

  return (
    <div>
      <form ref={ref} action={action}>
        <textarea
          name="note"
          rows={2}
          maxLength={4000}
          placeholder="« Toujours pressé, préfère le PETG, payer par virement »…"
          aria-label="Nouvelle note"
          className="w-full resize-y rounded-md border border-line bg-bg/60 px-2.5 py-2 text-base text-fg outline-none placeholder:text-muted/70 focus:border-accent sm:text-[13px]"
        />
        <div className="mt-1.5 flex items-center gap-3">
          <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1 text-[12.5px] transition hover:bg-fg/5 disabled:opacity-60">
            {pending && <LoaderCircle size={12} className="animate-spin" aria-hidden />}
            Ajouter la note
          </button>
          {state.status === "error" && <p className="text-[12px] text-red-300">{state.message}</p>}
        </div>
      </form>
      {notes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="group rounded-md border border-line bg-bg/40 p-2.5">
              <p className="whitespace-pre-line text-[13px]">{n.body}</p>
              <p className="mt-1 flex items-center text-[11px] text-muted">
                {dateTime.format(new Date(n.created_at))}
                {n.author_email && ` · ${n.author_email.split("@")[0]}`}
                <button
                  type="button"
                  onClick={() => confirm("Supprimer cette note ?") && start(() => deleteClientNote(n.id, email).then(() => undefined))}
                  aria-label="Supprimer la note"
                  className="ml-auto p-0.5 text-muted opacity-60 hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Trash2 size={12} aria-hidden />
                </button>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
