import Link from "next/link";
import { BarChart3, EyeOff, ImageOff, Layers, Package, Plus, Star, Tag } from "lucide-react";
import CollectionsManager from "./CollectionsManager";
import PageHeader from "../PageHeader";
import { requireAdmin } from "@/lib/admin";
import { sales } from "@/lib/finance";
import { getAllOrders } from "@/lib/orders";
import { getCollections, productColumns, toProduct, type ProductRow } from "@/lib/products";
import { categoryLabel, formatPrice } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Produits" };

export default async function AdminProducts() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(productColumns).order("position").order("name");
  const products = ((data ?? []) as ProductRow[]).map(toProduct);
  const live = products.filter((p) => p.active).length;
  const [orders, collections] = await Promise.all([getAllOrders(), getCollections()]);

  // Statistiques par article : pièces vendues et chiffre d'affaires (ventes encaissées).
  const since90 = new Date().getTime() - 90 * 86_400_000;
  const stats = new Map<string, { qty: number; cents: number; qty90: number }>();
  const add = (slug: string, qty: number, cents: number, recent: boolean) => {
    const s = stats.get(slug) ?? { qty: 0, cents: 0, qty90: 0 };
    s.qty += qty;
    s.cents += cents;
    if (recent) s.qty90 += qty;
    stats.set(slug, s);
  };
  for (const s of sales(orders)) {
    const recent = s.date.getTime() >= since90;
    if (s.order.items?.length) for (const i of s.order.items) add(i.slug, i.qty, i.qty * i.unit_cents, recent);
    else if (s.order.kind === "commande" && s.order.product_slug) add(s.order.product_slug, s.order.quantity, s.amount, recent);
  }
  const ranked = products
    .map((p) => ({ p, s: stats.get(p.slug) ?? { qty: 0, cents: 0, qty90: 0 } }))
    .sort((a, b) => b.s.cents - a.s.cents || b.s.qty - a.s.qty);
  const maxCents = Math.max(1, ...ranked.map((r) => r.s.cents));

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
              {p.stockQty > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 text-[11px] text-accent" title="Pièces déjà imprimées">
                  <Package size={11} aria-hidden /> {p.stockQty}
                </span>
              )}
              <span className={`shrink-0 font-mono text-[13px] ${p.priceCents === null ? "text-muted" : ""}`}>{formatPrice(p.priceCents)}</span>
            </Link>
          </li>
        ))}
        {products.length === 0 && <li className="px-4 py-10 text-center text-[13px] text-muted">Aucun article pour l&apos;instant.</li>}
      </ul>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-panel">
          <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <BarChart3 size={14} className="text-muted" aria-hidden />
            <h2 className="text-[13px] font-medium">Ventes par article</h2>
            <span className="ml-auto text-[11.5px] text-muted">depuis le début · 90 derniers jours</span>
          </header>
          <ul className="divide-y divide-line">
            {ranked.map(({ p, s }) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2 text-[12.5px]">
                <span className="w-36 shrink-0 truncate sm:w-44">{p.name}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/[0.06]">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${(s.cents / maxCents) * 100}%` }} />
                </span>
                <span className="w-16 shrink-0 text-right font-mono">{formatPrice(s.cents)}</span>
                <span className="w-20 shrink-0 text-right text-muted">
                  {s.qty} pce{s.qty > 1 ? "s" : ""} · {s.qty90}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-line bg-panel">
          <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <Layers size={14} className="text-muted" aria-hidden />
            <h2 className="text-[13px] font-medium">Collections</h2>
            <Link href="/admin/promos" className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-fg">
              <Tag size={11} aria-hidden /> Codes promo
            </Link>
          </header>
          <div className="p-4">
            <CollectionsManager collections={collections.map((c) => ({ slug: c.slug, name: c.name, count: products.filter((p) => p.collections.includes(c.slug)).length }))} />
          </div>
        </section>
      </div>
    </div>
  );
}
