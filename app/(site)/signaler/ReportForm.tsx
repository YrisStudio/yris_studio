"use client";

import { startTransition, useActionState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { sendReport, type ReportState } from "./actions";
import { reportCategories } from "@/lib/site";

const field =
  "w-full rounded-lg border border-line-strong bg-panel-2 px-3.5 py-2.5 text-[15px] text-fg outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/15 aria-[invalid=true]:border-red-500";
const label = "mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-muted";

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-red-400">
      {msg}
    </p>
  );
}

export default function ReportForm({
  user,
  initialCategory,
  initialOrder,
}: {
  user: { name: string; email: string } | null;
  initialCategory?: string;
  initialOrder?: string;
}) {
  const [state, action, pending] = useActionState<ReportState, FormData>(sendReport, { status: "idle" });

  if (state.status === "success") {
    return (
      <div role="status" className="py-10 text-center">
        <CheckCircle2 className="mx-auto size-14 text-emerald-400" strokeWidth={1.5} aria-hidden />
        <p className="mt-5 text-3xl font-medium tracking-tight">Message reçu.</p>
        <p className="mt-2 text-lg text-muted">Merci de nous avoir prévenus. On revient vers vous rapidement.</p>
      </div>
    );
  }

  const e = state.errors ?? {};

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="hidden" aria-hidden>
        <label>
          Ne pas remplir
          <input name="site_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset>
        <legend className={label}>Le problème concerne</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-bg p-1 sm:grid-cols-4">
          {reportCategories.map((c) => (
            <label
              key={c.id}
              className="cursor-pointer rounded-md px-2 py-2 text-center text-sm text-muted transition-colors has-[:checked]:bg-panel-2 has-[:checked]:text-fg has-[:checked]:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
            >
              <input
                type="radio"
                name="category"
                value={c.id}
                defaultChecked={c.id === (initialCategory ?? "commande")}
                className="sr-only"
              />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="order_ref" className={label}>
          Numéro de commande <span className="normal-case tracking-normal">(facultatif)</span>
        </label>
        <input id="order_ref" name="order_ref" defaultValue={initialOrder} placeholder="#A1B2C3D4" className={field} />
        <p className="mt-1.5 text-xs text-muted">Vous le trouvez dans « Mon compte », sous chaque commande.</p>
      </div>

      <div>
        <label htmlFor="message" className={label}>Que se passe-t-il ?</label>
        <textarea
          id="message"
          name="message"
          rows={6}
          placeholder="Décrivez le problème : ce que vous avez fait, ce qui s'est passé, ce que vous attendiez…"
          aria-invalid={!!e.message}
          aria-describedby={e.message ? "message-err" : undefined}
          className={`${field} resize-y`}
        />
        <FieldError id="message-err" msg={e.message} />
      </div>

      <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={label}>Nom</label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            defaultValue={user?.name}
            aria-invalid={!!e.name}
            aria-describedby={e.name ? "name-err" : undefined}
            className={field}
          />
          <FieldError id="name-err" msg={e.name} />
        </div>
        <div>
          <label htmlFor="email" className={label}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={user?.email}
            aria-invalid={!!e.email}
            aria-describedby={e.email ? "email-err" : undefined}
            className={field}
          />
          <FieldError id="email-err" msg={e.email} />
        </div>
      </div>

      {state.message && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="shine inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-accent-2 to-accent px-6 py-3 text-[15px] font-medium text-white shadow-[0_8px_30px_-8px_rgb(242_84_45/0.7),inset_0_1px_0_rgb(255_255_255/0.25)] transition hover:brightness-110 disabled:opacity-60"
      >
        {pending && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
        {pending ? "Envoi…" : "Envoyer le signalement"}
      </button>
    </form>
  );
}
