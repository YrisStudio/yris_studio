"use client";

import { useActionState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { sendContact, type ContactState } from "./actions";
import { plans } from "@/lib/site";

const field =
  "w-full rounded-2xl border border-line bg-white px-4 py-3.5 text-base outline-none transition-colors placeholder:text-black/35 focus:border-ink aria-[invalid=true]:border-red-500";

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-red-600">
      {msg}
    </p>
  );
}

export default function ContactForm({ defaultPlan }: { defaultPlan?: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, { status: "idle" });

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-3xl bg-mint p-8 text-mint-ink">
        <p className="text-xl font-medium">Message envoyé</p>
        <p className="mt-2 opacity-80">Merci ! On revient vers vous sous 24 heures.</p>
      </div>
    );
  }

  const e = state.errors ?? {};

  return (
    <form action={action} noValidate className="space-y-4">
      <div className="hidden" aria-hidden>
        <label>
          Ne pas remplir
          <input name="site_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Nom</label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Camille Martin"
            required
            aria-invalid={!!e.name}
            aria-describedby={e.name ? "name-err" : undefined}
            className={field}
          />
          <FieldError id="name-err" msg={e.name} />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="camille@exemple.fr"
            required
            aria-invalid={!!e.email}
            aria-describedby={e.email ? "email-err" : undefined}
            className={field}
          />
          <FieldError id="email-err" msg={e.email} />
        </div>
      </div>

      <div>
        <label htmlFor="formule" className="mb-1.5 block text-sm font-medium">Formule</label>
        <select id="formule" name="formule" defaultValue={defaultPlan ?? ""} className={field}>
          <option value="">Je ne sais pas encore</option>
          {plans.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name} · {p.price}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium">Votre projet</label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          placeholder="Votre activité, ce que vous attendez du site, une échéance…"
          aria-invalid={!!e.message}
          aria-describedby={e.message ? "message-err" : undefined}
          className={`${field} resize-y`}
        />
        <FieldError id="message-err" msg={e.message} />
      </div>

      {state.message && (
        <p role="alert" className="rounded-2xl bg-peach px-4 py-3 text-sm text-peach-ink">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Envoi…" : "Envoyer le message"}
        {pending ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
      </button>
    </form>
  );
}
