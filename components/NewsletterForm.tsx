"use client";

import { useActionState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { subscribeNewsletter, type NewsletterState } from "@/app/(site)/newsletter/actions";

// Inscription à la newsletter (pied de page) : une adresse, une case de consentement implicite au clic.
export default function NewsletterForm() {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeNewsletter, { status: "idle" });
  if (state.status === "success")
    return (
      <p className="flex items-center gap-2 text-fg">
        <Check size={15} className="text-accent" aria-hidden /> Merci, c&apos;est noté !
      </p>
    );
  return (
    <form action={action} className="space-y-2">
      <p className="text-fg">Les nouveautés de l&apos;atelier, une fois par mois.</p>
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="votre@email.fr"
          aria-label="Votre email"
          className="min-w-0 flex-1 rounded-lg border border-line-strong bg-transparent px-3 py-2 text-sm text-fg outline-none focus:border-accent"
        />
        <input type="text" name="site_web" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <button type="submit" disabled={pending} className="shrink-0 rounded-lg bg-fg px-3 py-2 text-sm font-medium text-bg disabled:opacity-60">
          {pending ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : "S'inscrire"}
        </button>
      </div>
      <p className="text-xs">Désinscription en un clic dans chaque email.</p>
      {state.status === "error" && <p className="text-xs text-red-500">{state.message}</p>}
    </form>
  );
}
