"use client";

import { startTransition, useActionState, useState } from "react";
import { CheckCircle2, LoaderCircle, Paperclip } from "lucide-react";
import { sendRequest, type RequestState } from "./actions";
import Link from "next/link";
import { MAX_FILES_BYTES, formatPrice, materials, products, requestTypes, type RequestType } from "@/lib/site";

// Seuls les articles à prix fixe se commandent directement.
const orderable = products.filter((p) => p.priceCents !== null);

export type FormUser = { name: string; email: string } | null;

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

const placeholders: Record<RequestType, string> = {
  commande: "Couleur souhaitée, précisions… (facultatif)",
  "sur-mesure":
    "Ex. : clip de fixation du panneau de porte avant gauche, Peugeot 208 de 2016. La pièce d'origine est cassée en deux.",
  projet: "Votre idée, à quoi elle sert, les quantités envisagées, une échéance…",
};

export default function RequestForm({
  initialType,
  initialArticle,
  initialDetails,
  user,
  loginHref,
  requireLogin,
}: {
  initialType: RequestType;
  initialArticle?: string;
  initialDetails?: string;
  user: FormUser;
  loginHref: string;
  requireLogin: boolean;
}) {
  const [state, action, pending] = useActionState<RequestState, FormData>(sendRequest, { status: "idle" });
  const [type, setType] = useState<RequestType>(initialType);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [delivery, setDelivery] = useState<"livraison" | "retrait">("livraison");
  const [fileError, setFileError] = useState<string>();

  if (state.status === "success") {
    return (
      <div role="status" className="py-10 text-center">
        <CheckCircle2 className="mx-auto size-14 text-emerald-400" strokeWidth={1.5} aria-hidden />
        <p className="mt-5 text-3xl font-medium tracking-tight">Demande envoyée.</p>
        <p className="mt-2 text-lg text-muted">Merci ! On revient vers vous sous 48 heures.</p>
        {state.saved && (
          <Link href="/compte" className="mt-6 inline-flex text-sm font-medium text-accent-2 hover:text-white">
            Suivre ma demande dans mon compte →
          </Link>
        )}
      </div>
    );
  }

  const e = state.errors ?? {};
  const filesMsg = fileError ?? e.files;

  // On soumet nous-mêmes pour éviter que React vide le formulaire en cas d'erreur.
  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (fileError) return;
    const fd = new FormData(ev.currentTarget);
    startTransition(() => action(fd));
  }

  function onFiles(ev: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(ev.target.files ?? []);
    setFileNames(list.map((f) => f.name));
    const total = list.reduce((n, f) => n + f.size, 0);
    setFileError(
      total > MAX_FILES_BYTES ? "Les fichiers dépassent 4 Mo au total. Envoyez-les plutôt par email après votre demande." : undefined,
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="hidden" aria-hidden>
        <label>
          Ne pas remplir
          <input name="site_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset>
        <legend className={label}>Vous souhaitez</legend>
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-bg p-1">
          {requestTypes.map((t) => (
            <label
              key={t.id}
              className="cursor-pointer rounded-md px-2 py-2 text-center text-sm text-muted transition-colors has-[:checked]:bg-panel-2 has-[:checked]:text-fg has-[:checked]:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
            >
              <input
                type="radio"
                name="type"
                value={t.id}
                checked={type === t.id}
                onChange={() => setType(t.id)}
                className="sr-only"
              />
              {t.label}
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">{requestTypes.find((t) => t.id === type)!.text}</p>
      </fieldset>

      {type === "commande" && requireLogin ? (
        <div className="rounded-xl border border-line-strong bg-panel-2 p-6 text-center">
          <p className="text-lg font-medium tracking-tight">Connectez-vous pour commander.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Votre commande sera enregistrée dans votre compte, avec vos favoris et votre historique.
          </p>
          <Link
            href={loginHref}
            className="shine mt-5 inline-flex rounded-lg bg-gradient-to-b from-accent-2 to-accent px-5 py-2.5 text-sm font-medium text-white"
          >
            Se connecter ou créer un compte
          </Link>
        </div>
      ) : (
        <>
      {type === "commande" && (
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <div>
            <label htmlFor="article" className={label}>Article</label>
            <select id="article" name="article" defaultValue={orderable.some((p) => p.slug === initialArticle) ? initialArticle : orderable[0].slug} className={field}>
              {orderable.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} · {formatPrice(p.priceCents)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="quantity" className={label}>Quantité</label>
            <input id="quantity" name="quantity" type="number" min={1} max={1000} defaultValue={1} className={field} />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="details" className={label}>
          {type === "commande" ? "Précisions" : type === "projet" ? "Votre projet" : "La pièce"}
        </label>
        <textarea
          id="details"
          name="details"
          rows={5}
          defaultValue={initialDetails}
          placeholder={placeholders[type]}
          aria-invalid={!!e.details}
          aria-describedby={e.details ? "details-err" : undefined}
          className={`${field} resize-y`}
        />
        <FieldError id="details-err" msg={e.details} />
      </div>

      {type !== "commande" && (
        <>
          <div>
            <span className={label}>Fichiers ou photos</span>
            <label
              htmlFor="files"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-line-strong bg-panel-2 px-4 py-7 text-center transition-colors hover:border-accent"
            >
              <Paperclip className="size-6 text-accent-2" aria-hidden />
              <span className="text-[15px]">
                {fileNames.length ? fileNames.join(", ") : "Ajouter un fichier STL, 3MF, OBJ, STEP ou des photos"}
              </span>
              <span className="text-xs text-muted">4 Mo au total. Facultatif.</span>
            </label>
            <input
              id="files"
              name="files"
              type="file"
              multiple
              accept=".stl,.3mf,.obj,.step,.stp,.jpg,.jpeg,.png,.heic,.webp,.pdf"
              onChange={onFiles}
              aria-describedby={filesMsg ? "files-err" : undefined}
              className="sr-only"
            />
            <FieldError id="files-err" msg={filesMsg} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="material" className={label}>Matériau</label>
              <select id="material" name="material" defaultValue="" className={field}>
                <option value="">Conseillez-moi</option>
                {materials.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} · {m.use}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="quantity" className={label}>Quantité</label>
              <input id="quantity" name="quantity" type="number" min={1} max={1000} defaultValue={1} className={field} />
            </div>
          </div>
        </>
      )}

      <div className="grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={label}>Nom</label>
          <input
            id="name"
            name="name"
            defaultValue={user?.name}
            autoComplete="name"
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
            defaultValue={user?.email}
            type="email"
            autoComplete="email"
            aria-invalid={!!e.email}
            aria-describedby={e.email ? "email-err" : undefined}
            className={field}
          />
          <FieldError id="email-err" msg={e.email} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="phone" className={label}>
            Téléphone <span className="normal-case tracking-normal">(facultatif)</span>
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={field} />
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className={label}>Réception</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-bg p-1">
          {(
            [
              ["livraison", "Livraison"],
              ["retrait", "Retrait en main propre"],
            ] as const
          ).map(([id, text]) => (
            <label
              key={id}
              className="cursor-pointer rounded-md px-2 py-2 text-center text-sm text-muted transition-colors has-[:checked]:bg-panel-2 has-[:checked]:text-fg has-[:checked]:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]"
            >
              <input
                type="radio"
                name="delivery"
                value={id}
                checked={delivery === id}
                onChange={() => setDelivery(id)}
                className="sr-only"
              />
              {text}
            </label>
          ))}
        </div>
        {delivery === "livraison" && (
          <div className="grid gap-4 sm:grid-cols-[1fr_140px_1fr]">
            <div className="sm:col-span-3">
              <label htmlFor="address" className={label}>Adresse</label>
              <input
                id="address"
                name="address"
                autoComplete="street-address"
                placeholder="12 rue des Lilas"
                aria-invalid={!!e.address}
                aria-describedby={e.address ? "address-err" : undefined}
                className={field}
              />
              <FieldError id="address-err" msg={e.address} />
            </div>
            <div className="sm:col-start-1">
              <label htmlFor="postal_code" className={label}>Code postal</label>
              <input id="postal_code" name="postal_code" autoComplete="postal-code" inputMode="numeric" className={field} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="city" className={label}>Ville</label>
              <input id="city" name="city" autoComplete="address-level2" className={field} />
            </div>
          </div>
        )}
      </fieldset>

      {state.message && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-accent-2 to-accent px-6 py-3 text-[15px] font-medium text-white shadow-[0_8px_30px_-8px_rgb(242_84_45/0.7),inset_0_1px_0_rgb(255_255_255/0.25)] transition hover:brightness-110 disabled:opacity-60"
      >
        {pending && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
        {pending ? "Envoi…" : type === "commande" ? "Envoyer la commande" : "Demander un devis gratuit"}
      </button>
        </>
      )}
    </form>
  );
}
