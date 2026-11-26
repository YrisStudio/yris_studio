"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Plus, X } from "lucide-react";
import { saveComm, type SettingsState } from "./actions";
import type { CannedReply, CommSettings } from "@/lib/settings";

const field = "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";
const label = "mb-1 block text-[12px] text-fg/85";
const statusNames: Record<string, string> = { "devis envoyé": "Devis envoyé", "en impression": "En impression", terminée: "Commande prête", annulée: "Annulée" };

export default function CommForm({ comm, defaults }: { comm: CommSettings; defaults: Record<string, { title: string; message: string }> }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveComm, { status: "idle" });
  const [replies, setReplies] = useState<CannedReply[]>(comm.replies);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="replies" value={JSON.stringify(replies)} />

      <fieldset className="space-y-3">
        <legend className="mb-2 text-[13px] font-medium">Emails envoyés au client à chaque étape</legend>
        <p className="text-[12px] text-muted">L&apos;email commence toujours par « Bonjour Prénom, » suivi de votre message. Laissez vide pour garder le texte d&apos;origine.</p>
        {Object.keys(statusNames).map((s) => (
          <div key={s} className="grid gap-2 sm:grid-cols-[220px_1fr]">
            <div>
              <span className={label}>{statusNames[s]} · titre</span>
              <input name={`t_${s}_title`} defaultValue={comm.templates[s]?.title ?? ""} placeholder={defaults[s]?.title} className={field} />
            </div>
            <div>
              <span className={label}>Message</span>
              <textarea name={`t_${s}_message`} rows={2} defaultValue={comm.templates[s]?.message ?? ""} placeholder={defaults[s]?.message} className={`${field} resize-y`} />
            </div>
          </div>
        ))}
      </fieldset>

      <div>
        <label htmlFor="c-review" className={label}>
          Lien vers vos avis Google (ajouté à l&apos;email « Commande prête »)
        </label>
        <input id="c-review" name="reviewUrl" defaultValue={comm.reviewUrl} placeholder="https://g.page/r/…/review" className={field} />
      </div>

      <div>
        <label htmlFor="c-winback" className={label}>
          Message de relance des clients inactifs (Clients → À relancer)
        </label>
        <textarea id="c-winback" name="winBack" rows={2} defaultValue={comm.winBack} className={`${field} resize-y`} />
      </div>

      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">Réponses toutes faites (boîte de réception)</legend>
        <p className="mb-2 text-[12px] text-muted">{"{prénom}"} est remplacé par le prénom du client.</p>
        <ul className="space-y-2">
          {replies.map((r, i) => (
            <li key={i} className="grid gap-2 rounded-md border border-line p-2 sm:grid-cols-[200px_1fr_auto]">
              <input value={r.title} onChange={(e) => setReplies((all) => all.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} aria-label="Titre" className={field} />
              <textarea value={r.body} rows={3} onChange={(e) => setReplies((all) => all.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} aria-label="Texte" className={`${field} resize-y`} />
              <button type="button" onClick={() => setReplies((all) => all.filter((_, j) => j !== i))} aria-label="Retirer" className="self-start p-1 text-muted hover:text-red-300">
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setReplies((all) => [...all, { title: "Nouvelle réponse", body: "Bonjour {prénom},\n\n" }])} className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-fg">
          <Plus size={13} aria-hidden /> Ajouter une réponse
        </button>
      </fieldset>

      <div className="flex items-center gap-3 border-t border-line pt-3">
        <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-md bg-fg px-3 py-1.5 text-[12.5px] font-medium text-bg disabled:opacity-60">
          {pending && <LoaderCircle size={13} className="animate-spin" aria-hidden />}
          Enregistrer
        </button>
        {state.message && <p className={`text-[12px] ${state.status === "error" ? "text-red-300" : "text-accent"}`}>{state.message}</p>}
      </div>
    </form>
  );
}
