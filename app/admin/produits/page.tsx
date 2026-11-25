import Link from "next/link";
import { EyeOff, ImageOff, Plus, Star } from "lucide-react";
import PageHeader from "../PageHeader";
import { requireAdmin } from "@/lib/admin";
import { productColumns, toProduct, type ProductRow } from "@/lib/products";
import { categoryLabel, formatPrice } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Produits" };

export default async function AdminProducts() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(productColumns).order("position").order("name");
  const products = ((data ?? []) as ProductRow[]).map(toProduct);
  const live = products.filter((p) => p.active).length;

  return (
    <div>
      <PageHeader title="Produits" description={`${products.length} article(s) · ${live} en vente sur la boutique`}>
        <Link
          href="/admin/produits/nouveau"
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-on-accent hover:brightness-110"
        >
          <Plus size={14} aria-hidden /> Nouvel article
        </Link>
      </PageHeader>

      <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/admin/produits/${p.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-fg/[0.03]">
              {p.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element -- miniature Supabase Storage
                <img src={p.photos[0]} alt="" className="size-11 shrink-0 rounded-md border border-line object-cover" />
              ) : (
                <span className="grid size-11 shrink-0 place-items-center rounded-md border border-dashed border-line text-muted" title="Pas de photo">
                  <ImageOff size={15} aria-hidden />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[13.5px] font-medium">
                  {p.name}
                  {p.featured && <Star size={12} className="shrink-0 fill-accent text-accent" aria-label="Mis en avant sur l'accueil" />}
                  {!p.active && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded bg-fg/[0.06] px-1.5 py-0.5 text-[11px] font-normal text-muted">
                      <EyeOff size={11} aria-hidden /> Masqué
                    </span>
                  )}
                </p>
                <p className="truncate text-[12px] text-muted">
                  {categoryLabel(p.category)} · {p.material}
                  {p.colors.length > 0 && ` · ${p.colors.length} couleur(s)`} · {p.photos.length} photo(s)
                </p>
              </div>
              <span className={`shrink-0 font-mono text-[13px] ${p.priceCents === null ? "text-muted" : ""}`}>{formatPrice(p.priceCents)}</span>
            </Link>
          </li>
        ))}
        {products.length === 0 && <li className="px-4 py-10 text-center text-[13px] text-muted">Aucun article pour l&apos;instant.</li>}
      </ul>
    </div>
  );
}
