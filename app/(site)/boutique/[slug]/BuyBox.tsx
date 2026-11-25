"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { addToCart, MAX_QTY } from "@/lib/cart";
import { swatch } from "@/lib/colors";
import { formatPrice } from "@/lib/site";

// Choix de la couleur et de la quantité, puis ajout au panier.
export default function BuyBox({ slug, priceCents, colors }: { slug: string; priceCents: number | null; colors: string[] }) {
  const options = colors.length ? colors : ["Au choix"];
  const [color, setColor] = useState(options[0]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (priceCents === null) {
    return (
      <div className="mt-8">
        <p className="text-sm text-muted">Chaque pièce est différente : on vous fait un prix sous 48 h, gratuitement.</p>
        <Link
          href={`/demande?type=sur-mesure&article=${slug}`}
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-fg px-5 py-3 text-sm font-medium text-bg transition hover:opacity-90"
        >
          Demander un devis
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <fieldset>
        <legend className="mb-2.5 font-mono text-[11px] uppercase tracking-wider text-muted">
          Couleur <span className="normal-case tracking-normal text-fg">· {color}</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {options.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="color" value={c} checked={color === c} onChange={() => setColor(c)} className="peer sr-only" />
              <span className="inline-flex items-center gap-2 rounded-full border border-line-strong py-1.5 pl-1.5 pr-3.5 text-sm transition peer-checked:border-fg peer-checked:ring-1 peer-checked:ring-fg peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                {colors.length > 0 && (
                  <span className="size-5 rounded-full border border-black/10" style={{ background: swatch(c) }} aria-hidden />
                )}
                {c}
              </span>
            </label>
          ))}
        </div>
        {!colors.length && <p className="mt-2 text-xs text-muted">Précisez la couleur souhaitée dans le panier.</p>}
      </fieldset>

      <div className="flex items-stretch gap-3">
        <div className="flex items-center rounded-lg border border-line-strong" role="group" aria-label="Quantité">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Moins" className="p-3 text-muted hover:text-fg">
            <Minus size={15} />
          </button>
          <span className="w-8 text-center font-mono text-sm" aria-live="polite">
            {qty}
          </span>
          <button type="button" onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))} aria-label="Plus" className="p-3 text-muted hover:text-fg">
            <Plus size={15} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            addToCart(slug, color, qty);
            setAdded(true);
            setTimeout(() => setAdded(false), 2500);
          }}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-medium text-white transition hover:brightness-110"
        >
          {added ? <Check size={16} aria-hidden /> : <ShoppingBag size={16} aria-hidden />}
          {added ? "Ajouté au panier" : `Ajouter · ${formatPrice(priceCents * qty)}`}
        </button>
      </div>
      {added && (
        <p role="status" className="text-sm">
          <Link href="/panier" className="font-medium text-accent underline underline-offset-4">
            Voir le panier
          </Link>{" "}
          ou continuez vos achats.
        </p>
      )}
    </div>
  );
}
