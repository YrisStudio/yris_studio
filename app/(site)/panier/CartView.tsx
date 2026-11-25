"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { checkout, type CheckoutState } from "./actions";
import { CategoryGlyph } from "@/components/Art";
import { clearCart, MAX_QTY, setQty, useCart } from "@/lib/cart";
import { swatch } from "@/lib/colors";
import { formatPrice, type Category } from "@/lib/site";

type CatalogItem = { slug: string; name: string; priceCents: number; photo: string | null; colors: string[]; category: Category };

const field =
  "w-full rounded-lg border border-line-strong bg-panel-2 px-3.5 py-2.5 text-[15px] text-fg outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/15 aria-[invalid=true]:border-red-500";
const label = "mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-muted";

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 text-sm text-red-600">{msg}</p> : null;
}

export default function CartView({
  catalog,
  shippingCents,
  user,
}: {
  catalog: CatalogItem[];
  shippingCents: number;
  user: { name: string; email: string } | null;
}) {
  const cart = useCart();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkout, { status: "idle" });
  const [delivery, setDelivery] = useState<"livraison" | "retrait">("livraison");

  // Commande enregistrée : on vide le panier.
  useEffect(() => {
    if (state.status === "success") clearCart();
  }, [state.status]);

  if (state.status === "success") {
    return (
      <div role="status" className="py-16 text-center">
        <CheckCircle2 className="mx-auto size-14 text-accent" strokeWidth={1.5} aria-hidden />
        <p className="mt-5 text-3xl font-medium tracking-tight">Commande envoyée.</p>
        {state.ref && <p className="mt-2 font-mono text-sm text-muted">Référence {state.ref}</p>}
        <p className="mx-auto mt-3 max-w-md text-muted">
          Merci ! Vous allez recevoir un email de confirmation. On vous envoie le lien de paiement, puis on lance l&apos;impression.
        </p>
        <Link href="/boutique" className="mt-8 inline-flex rounded-lg border border-line-strong px-5 py-2.5 text-sm hover:border-fg">
          Retour à la boutique
        </Link>
      </div>
    );
  }

  const lines = cart
    .map((i) => ({ ...i, product: catalog.find((p) => p.slug === i.slug) }))
    .filter((l): l is typeof l & { product: CatalogItem } => Boolean(l.product));
  const subtotal = lines.reduce((n, l) => n + l.qty * l.product.priceCents, 0);
  const shipping = delivery === "livraison" ? shippingCents : 0;

  if (!lines.length) {
    return (
      <div className="py-20 text-center">
        <ShoppingBag className="mx-auto size-12 text-muted" strokeWidth={1.5} aria-hidden />
        <p className="mt-4 text-xl font-medium">Votre panier est vide.</p>
        <Link href="/boutique" className="mt-6 inline-flex rounded-lg bg-fg px-5 py-2.5 text-sm font-medium text-bg hover:opacity-90">
          Voir la boutique
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <input type="hidden" name="items" value={JSON.stringify(lines.map((l) => ({ slug: l.slug, color: l.color, qty: l.qty })))} />
      <input type="text" name="site_web" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <div>
        <ul className="divide-y divide-line border-y border-line">
          {lines.map((l) => (
            <li key={`${l.slug}-${l.color}`} className="flex gap-4 py-5">
              <Link href={`/boutique/${l.slug}`} className="block size-24 shrink-0 overflow-hidden rounded-xl border border-line bg-panel">
                {l.product.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- photo Supabase Storage
                  <img src={l.product.photo} alt="" className="size-full object-cover" />
                ) : (
                  <CategoryGlyph category={l.product.category} className="size-full" />
                )}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/boutique/${l.slug}`} className="font-medium hover:underline hover:underline-offset-4">
                      {l.product.name}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                      {l.product.colors.length > 0 && <span className="size-3 rounded-full border border-black/10" style={{ background: swatch(l.color) }} aria-hidden />}
                      {l.color}
                    </p>
                  </div>
                  <p className="font-mono text-sm">{formatPrice(l.qty * l.product.priceCents)}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-lg border border-line-strong" role="group" aria-label={`Quantité de ${l.product.name}`}>
                    <button type="button" onClick={() => setQty(l.slug, l.color, l.qty - 1)} aria-label="Moins" className="p-2 text-muted hover:text-fg">
                      <Minus size={14} />
                    </button>
                    <span className="w-7 text-center font-mono text-sm">{l.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(l.slug, l.color, Math.min(MAX_QTY, l.qty + 1))}
                      aria-label="Plus"
                      className="p-2 text-muted hover:text-fg"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button type="button" onClick={() => setQty(l.slug, l.color, 0)} className="inline-flex items-center gap-1 text-sm text-muted hover:text-red-600">
                    <Trash2 size={14} aria-hidden /> Retirer
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Err msg={state.errors?.items} />

        <fieldset className="mt-10 space-y-4">
          <legend className="mb-4 text-xl font-medium tracking-tight">Vos coordonnées</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-name" className={label}>
                Nom
              </label>
              <input id="c-name" name="name" required autoComplete="name" defaultValue={user?.name} aria-invalid={Boolean(state.errors?.name)} className={field} />
              <Err msg={state.errors?.name} />
            </div>
            <div>
              <label htmlFor="c-email" className={label}>
                Email
              </label>
              <input id="c-email" name="email" type="email" required autoComplete="email" defaultValue={user?.email} aria-invalid={Boolean(state.errors?.email)} className={field} />
              <Err msg={state.errors?.email} />
            </div>
          </div>
          <div>
            <label htmlFor="c-phone" className={label}>
              Téléphone <span className="normal-case tracking-normal">(facultatif)</span>
            </label>
            <input id="c-phone" name="phone" type="tel" autoComplete="tel" className={field} />
          </div>

          <div role="radiogroup" aria-label="Réception" className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["livraison", "Livraison", formatPrice(shippingCents)],
                ["retrait", "Retrait en main propre", "Gratuit"],
              ] as const
            ).map(([id, title, price]) => (
              <label key={id} className="flex cursor-pointer items-center justify-between rounded-lg border border-line-strong bg-panel-2 px-4 py-3 has-[:checked]:border-fg has-[:checked]:ring-1 has-[:checked]:ring-fg">
                <span className="flex items-center gap-2.5 text-sm">
                  <input type="radio" name="delivery" value={id} checked={delivery === id} onChange={() => setDelivery(id)} className="accent-[var(--color-accent)]" />
                  {title}
                </span>
                <span className="font-mono text-sm text-muted">{price}</span>
              </label>
            ))}
          </div>

          {delivery === "livraison" && (
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1.4fr]">
              <div>
                <label htmlFor="c-address" className={label}>
                  Adresse
                </label>
                <input id="c-address" name="address" autoComplete="street-address" aria-invalid={Boolean(state.errors?.address)} className={field} />
              </div>
              <div>
                <label htmlFor="c-zip" className={label}>
                  Code postal
                </label>
                <input id="c-zip" name="postal_code" autoComplete="postal-code" inputMode="numeric" className={field} />
              </div>
              <div>
                <label htmlFor="c-city" className={label}>
                  Ville
                </label>
                <input id="c-city" name="city" autoComplete="address-level2" className={field} />
              </div>
              <div className="sm:col-span-3">
                <Err msg={state.errors?.address} />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="c-note" className={label}>
              Précisions <span className="normal-case tracking-normal">(facultatif)</span>
            </label>
            <textarea id="c-note" name="note" rows={3} maxLength={2000} placeholder="Une couleur particulière, une date souhaitée…" className={`${field} resize-y`} />
          </div>
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-line bg-panel-2 p-6">
          <h2 className="text-lg font-medium">Récapitulatif</h2>
          <dl className="mt-5 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Articles ({lines.reduce((n, l) => n + l.qty, 0)})</dt>
              <dd className="font-mono">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{delivery === "livraison" ? "Livraison" : "Retrait"}</dt>
              <dd className="font-mono">{shipping ? formatPrice(shipping) : "Gratuit"}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
              <dt>Total</dt>
              <dd className="font-mono">{formatPrice(subtotal + shipping)}</dd>
            </div>
          </dl>
          <button
            type="submit"
            disabled={pending}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {pending && <LoaderCircle size={15} className="animate-spin" aria-hidden />}
            Commander
          </button>
          {state.message && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {state.message}
            </p>
          )}
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Aucun paiement maintenant : on confirme votre commande par email et on vous envoie le lien de paiement avant de lancer l&apos;impression.
          </p>
        </div>
      </aside>
    </form>
  );
}
