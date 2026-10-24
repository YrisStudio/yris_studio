"use client";

import { startTransition, useActionState, useState } from "react";
import { LoaderCircle, MailCheck } from "lucide-react";
import { authenticate, type AuthState } from "./actions";

const field =
  "w-full rounded-lg border border-line-strong bg-panel-2 px-3.5 py-2.5 text-[15px] text-fg outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/15";
const label = "mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-muted";

export default function AuthForm({ next, initialMode }: { next: string; initialMode: "connexion" | "inscription" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(authenticate, { status: "idle" });
  const [mode, setMode] = useState(initialMode);

  if (state.status === "check-email") {
    return (
      <div role="status" className="py-6 text-center">
        <MailCheck className="mx-auto size-12 text-accent-2" strokeWidth={1.5} aria-hidden />
        <p className="mt-5 text-2xl font-medium tracking-tight">Vérifiez vos emails.</p>
        <p className="mt-2 text-sm text-muted">
          On a envoyé un lien de confirmation à <span className="text-fg">{state.email}</span>. Cliquez dessus pour
          activer votre compte.
        </p>
      </div>
    );
  }

  // On soumet nous-mêmes pour que React ne vide pas le formulaire en cas d'erreur.
  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="mode" value={mode} />

      <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-bg p-1" role="tablist">
        {(["connexion", "inscription"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className="rounded-md px-2 py-2 text-sm text-muted transition-colors aria-selected:bg-panel-2 aria-selected:text-fg aria-selected:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]"
          >
            {m === "connexion" ? "Se connecter" : "Créer un compte"}
          </button>
        ))}
      </div>

      {mode === "inscription" && (
        <div>
          <label htmlFor="name" className={label}>Nom</label>
          <input id="name" name="name" autoComplete="name" className={field} />
        </div>
      )}
      <div>
        <label htmlFor="email" className={label}>Email</label>
        <input id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} className={field} />
      </div>
      <div>
        <label htmlFor="password" className={label}>Mot de passe</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "connexion" ? "current-password" : "new-password"}
          placeholder={mode === "inscription" ? "8 caractères minimum" : undefined}
          className={field}
        />
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
        {mode === "connexion" ? "Se connecter" : "Créer mon compte"}
      </button>
    </form>
  );
}
