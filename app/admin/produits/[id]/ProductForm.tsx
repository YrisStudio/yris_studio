"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";
import { deleteProduct, saveProduct, type ProductState } from "../actions";
import { categories, categoryLabel, materials, type Product } from "@/lib/site";

const field =
  "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition placeholder:text-muted/50 focus:border-accent sm:text-[13px]";
const label = "mb-1 block text-[12px] text-fg/85";
const hint = "mt-1 text-[11.5px] text-muted";

const euro = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(2).replace(".", ","));

export default function ProductForm({ product }: { product: Product | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ProductState, FormData>(saveProduct, { status: "idle" });
  const [deleting, startDelete] = useTransition();

  // Après la création, on passe sur la fiche pour ajouter les photos.
  useEffect(() => {
    if (!product && state.status === "success" && state.id) router.replace(`/admin/produits/${state.id}`);
  }, [product, state, router]);

  function remove() {
    if (!product || !confirm(`Supprimer « ${product.name} » et ses photos ?\n\nPour juste le retirer de la boutique, décoche plutôt « En vente ».`)) return;
    startDelete(async () => {
      const res = await deleteProduct(product.id);
      if (res.status === "success") router.replace("/admin/produits");
      else alert(res.message);
    });
  }

  return (
    <form action={action} className="space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-name" className={label}>
            Nom
          </label>
          <input id="p-name" name="name" required maxLength={80} defaultValue={product?.name} placeholder="Support téléphone" className={field} />
        </div>
        <div>
          <label htmlFor="p-slug" className={label}>
            Adresse de la page
          </label>
          <input id="p-slug" name="slug" maxLength={60} defaultValue={product?.slug} placeholder="tirée du nom si vide" className={field} />
          <p className={hint}>yris-studio.com/boutique/{product?.slug ?? "…"}</p>
        </div>
        <div>
          <label htmlFor="p-cat" className={label}>
            Catégorie
          </label>
          <select id="p-cat" name="category" defaultValue={product?.category ?? "Maison"} className={field}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p-price" className={label}>
            Prix (€)
          </label>
          <input id="p-price" name="price" inputMode="decimal" defaultValue={euro(product?.priceCents ?? null)} placeholder="Vide = sur devis" className={field} />
          <p className={hint}>Laisse vide pour un article sur devis.</p>
        </div>
        <div>
          <label htmlFor="p-mat" className={label}>
            Matière
          </label>
          <input id="p-mat" name="material" list="p-materials" maxLength={40} defaultValue={product?.material ?? "PLA"} className={field} />
          <datalist id="p-materials">
            {materials.map((m) => (
              <option key={m.name} value={m.name} />
            ))}
            <option value="Selon usage" />
          </datalist>
        </div>
        <div>
          <label htmlFor="p-lead" className={label}>
            Délai de fabrication (jours ouvrés)
          </label>
          <input id="p-lead" name="lead_days" type="number" min={0} max={60} defaultValue={product?.leadDays ?? 3} className={field} />
        </div>
      </div>

      <div>
        <label htmlFor="p-colors" className={label}>
          Couleurs proposées
        </label>
        <input id="p-colors" name="colors" defaultValue={product?.colors.join(", ")} placeholder="Noir, Blanc, Gris" className={field} />
        <p className={hint}>Séparées par des virgules. Vide = couleur à préciser par le client.</p>
      </div>
      <div>
        <label htmlFor="p-summary" className={label}>
          Phrase courte (cartes de la boutique)
        </label>
        <input id="p-summary" name="summary" maxLength={200} defaultValue={product?.text} className={field} />
      </div>
      <div>
        <label htmlFor="p-desc" className={label}>
          Description (page de l&apos;article)
        </label>
        <textarea id="p-desc" name="description" rows={6} maxLength={4000} defaultValue={product?.description} className={`${field} resize-y leading-relaxed`} placeholder="Dimensions, fixation, entretien…" />
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="inline-flex items-center gap-2 text-[13px]">
          <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="size-4 accent-[var(--color-accent)]" />
          En vente sur la boutique
        </label>
        <label className="inline-flex items-center gap-2 text-[13px]">
          <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} className="size-4 accent-[var(--color-accent)]" />
          Mis en avant sur l&apos;accueil
        </label>
        <label className="inline-flex items-center gap-2 text-[13px]">
          Ordre
          <input name="position" type="number" defaultValue={product?.position ?? 0} className={`${field} w-20`} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-[13px] font-medium text-on-accent hover:brightness-110 disabled:opacity-60"
        >
          {pending && <LoaderCircle size={13} className="animate-spin" aria-hidden />}
          {product ? "Enregistrer" : "Créer l'article"}
        </button>
        {state.message && (
          <p role="status" className={`text-[12.5px] ${state.status === "error" ? "text-red-300" : "text-accent"}`}>
            {state.message}
          </p>
        )}
        {product && (
          <button type="button" onClick={remove} disabled={deleting} className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-red-300 disabled:opacity-50">
            <Trash2 size={13} aria-hidden /> Supprimer l&apos;article
          </button>
        )}
      </div>
    </form>
  );
}
