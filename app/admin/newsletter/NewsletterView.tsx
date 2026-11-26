"use client";

import { useActionState, useTransition } from "react";
import { FlaskConical, LoaderCircle, Send, Trash2 } from "lucide-react";
import { removeSubscriber, sendNewsletterAction, type NewsletterSendState } from "./actions";

const field = "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";

export default function NewsletterView({ subscribers }: { subscribers: { email: string; since: string }[] }) {
  const [state, action, pending] = useActionState<NewsletterSendState, FormData>(sendNewsletterAction, { status: "idle" });
  const [, start] = useTransition();
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <form
        action={(fd) => {
          if (fd.get("mode") === "all" && !confirm(`Envoyer la newsletter à ${subscribers.length} abonné(s) ? Impossible d'annuler.`)) return;
          action(fd);
        }}
        className="space-y-3 rounded-lg border border-line bg-panel p-4"
      >
        <h2 className="text-[13px] font-medium">Nouvelle newsletter</h2>
        <input name="subject" required maxLength={150} placeholder="Objet : Nouveautés de novembre à l'atelier" aria-label="Objet" className={field} />
        <textarea
          name="body"
          required
          rows={10}
          maxLength={8000}
          placeholder={"Bonjour,\n\nCe mois-ci à l'atelier…\n\nÀ bientôt,\nL'équipe Yris Studio"}
          aria-label="Message"
          className={`${field} resize-y leading-relaxed`}
        />
        <p className="text-[11.5px] text-muted">Le message est mis en page avec le logo Yris, un bouton vers la boutique et un lien de désinscription personnel.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" name="mode" value="test" disabled={pending} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[12.5px] hover:border-line-strong disabled:opacity-60">
            <FlaskConical size={13} aria-hidden /> M&apos;envoyer un test
          </button>
          <button type="submit" name="mode" value="all" disabled={pending || !subscribers.length} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-medium text-on-accent disabled:opacity-50">
            {pending ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Send size={13} aria-hidden />} Envoyer à {subscribers.length} abonné(s)
          </button>
          {state.message && <p className={`text-[12px] ${state.status === "error" ? "text-red-300" : "text-accent"}`}>{state.message}</p>}
        </div>
      </form>

      <section className="rounded-lg border border-line bg-panel">
        <h2 className="border-b border-line px-4 py-2.5 text-[13px] font-medium">Inscrits</h2>
        {subscribers.length ? (
          <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
            {subscribers.map((s) => (
              <li key={s.email} className="group flex items-center gap-2 px-4 py-1.5 text-[12.5px]">
                <span className="min-w-0 flex-1 truncate">{s.email}</span>
                <span className="text-[11px] text-muted">{new Date(s.since).toLocaleDateString("fr-FR")}</span>
                <button type="button" onClick={() => confirm(`Retirer ${s.email} ?`) && start(() => removeSubscriber(s.email))} aria-label={`Retirer ${s.email}`} className="text-muted opacity-60 hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100">
                  <Trash2 size={12} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-[12.5px] text-muted">Personne encore. Le formulaire d&apos;inscription est en bas de chaque page du site.</p>
        )}
      </section>
    </div>
  );
}
