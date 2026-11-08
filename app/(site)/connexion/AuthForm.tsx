"use client";

import { startTransition, useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, MailCheck } from "lucide-react";
import { authenticate, type AuthState } from "./actions";

type Mode = "connexion" | "inscription";

const field =
  "w-full rounded-xl border border-line-strong bg-bg/60 px-4 py-3 text-base text-fg outline-none transition placeholder:text-muted/50 focus:border-accent focus:bg-bg focus:ring-4 focus:ring-accent/15 sm:text-[15px]";
const label = "mb-1.5 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted";

const copy: Record<Mode, { title: string; intro: string; submit: string }> = {
  connexion: { title: "Content de vous revoir.", intro: "Retrouvez vos commandes, vos devis et vos favoris.", submit: "Se connecter" },
  inscription: { title: "Rejoignez l'atelier.", intro: "Un compte pour suivre vos impressions en direct.", submit: "Créer mon compte" },
};

// Solidité du mot de passe, présentée comme le taux de remplissage d'une pièce imprimée.
function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const strengthLabel = ["Trop fragile", "Fragile", "Correct", "Solide", "Blindé"];

export default function AuthForm({ next, initialMode, reason }: { next: string; initialMode: Mode; reason?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(authenticate, { status: "idle" });
  const [mode, setMode] = useState<Mode>(initialMode);
  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState("");

  if (state.status === "check-email") {
    return (
      <div role="status" className="py-10 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl border border-accent/30 bg-accent/10">
          <MailCheck className="size-8 text-accent-2" strokeWidth={1.5} aria-hidden />
        </span>
        <p className="mt-6 text-3xl font-medium tracking-tight">Vérifiez vos emails.</p>
        <p className="mx-auto mt-3 max-w-xs text-sm text-muted">
          On a envoyé un lien de confirmation à <span className="text-fg">{state.email}</span>. Cliquez dessus pour activer
          votre compte.
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

  const level = strength(pw);
  const text = copy[mode];

  return (
    <div>
      <h1 className="text-4xl font-medium tracking-tight sm:text-[44px] sm:leading-[1.05]">{text.title}</h1>
      <p className="mt-3 text-[15px] text-muted">{reason ?? text.intro}</p>

      {/* Bascule connexion / inscription, avec une pastille qui glisse */}
      <div className="relative mt-8 grid grid-cols-2 rounded-xl border border-line bg-bg/60 p-1" role="tablist" aria-label="Type de compte">
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg border border-line-strong bg-panel-2 shadow-[0_6px_20px_-8px_rgb(0_0_0/0.8)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: mode === "inscription" ? "translateX(100%)" : "none" }}
        />
        {(["connexion", "inscription"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className="relative rounded-lg px-2 py-2.5 text-sm text-muted transition-colors aria-selected:text-fg"
          >
            {m === "connexion" ? "Se connecter" : "Créer un compte"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="mode" value={mode} />

        {mode === "inscription" && (
          <div className="animate-rise">
            <label htmlFor="name" className={label}>Nom</label>
            <input id="name" name="name" autoComplete="name" placeholder="Raphaël Gauthier" className={field} />
          </div>
        )}
        <div>
          <label htmlFor="email" className={label}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="vous@exemple.fr"
            defaultValue={state.email}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="password" className={label}>
            Mot de passe
            {mode === "inscription" && <span className="normal-case tracking-normal text-muted/80">8 caractères minimum</span>}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPw ? "text" : "password"}
              autoComplete={mode === "connexion" ? "current-password" : "new-password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className={`${field} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              aria-pressed={showPw}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted transition hover:text-fg"
            >
              {showPw ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </button>
          </div>

          {mode === "inscription" && pw.length > 0 && (
            <div className="mt-2.5 flex items-center gap-3" aria-live="polite">
              <div className="grid flex-1 grid-cols-4 gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-colors duration-300 ${i <= level ? "bg-accent" : "bg-fg/10"}`}
                  />
                ))}
              </div>
              <span className="w-24 text-right font-mono text-[11px] text-muted">{strengthLabel[level]}</span>
            </div>
          )}
        </div>

        {state.message && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="shine group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-accent-2 to-accent px-6 py-3.5 text-[15px] font-medium text-on-accent shadow-[0_10px_34px_-10px_rgb(74_222_128/0.7),inset_0_1px_0_rgb(255_255_255/0.3)] transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : null}
          {text.submit}
          {!pending && <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" aria-hidden />}
        </button>
      </form>
    </div>
  );
}
