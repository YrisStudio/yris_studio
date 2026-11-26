import type { Metadata } from "next";
import Link from "next/link";
import { FinalCta, ProductCard } from "@/components/sections";
import { Container, Eyebrow } from "@/components/ui";
import { getFavoriteSlugs } from "@/lib/favorites";
import { getCollections, getProducts } from "@/lib/products";
import { authEnabled } from "@/lib/supabase/server";
import { categories, categoryLabel, type Category } from "@/lib/site";

export const metadata: Metadata = {
  title: "Boutique",
  description: "Pièces auto, objets pour la maison et le bureau, imprimés en 3D à la commande.",
};

const sorts = [
  { id: "", label: "Sélection", title: "Notre sélection" },
  { id: "prix", label: "Prix ↑", title: "Prix croissant" },
  { id: "prix-desc", label: "Prix ↓", title: "Prix décroissant" },
] as const;

export default async function BoutiquePage({ searchParams }: { searchParams: Promise<{ categorie?: string; tri?: string; collection?: string }> }) {
  const { categorie, tri, collection } = await searchParams;
  const [favorites, all, collections] = await Promise.all([getFavoriteSlugs(), getProducts(), getCollections()]);
  const currentCollection = collections.find((c) => c.slug === collection) ?? null;
  const current = categories.find((c) => c.toLowerCase() === categorie) ?? null;
  const sort = sorts.find((s) => s.id === tri)?.id ?? "";

  let products = current ? all.filter((p) => p.category === current) : all;
  if (currentCollection) products = products.filter((p) => p.collections.includes(currentCollection.slug));
  if (sort) {
    // Les articles sur devis passent à la fin, quel que soit l'ordre.
    const price = (c: number | null) => (c === null ? Infinity : sort === "prix" ? c : -c);
    products = [...products].sort((a, b) => price(a.priceCents) - price(b.priceCents));
  }

  const href = (cat: Category | null, s = sort) => {
    const q = new URLSearchParams({ ...(cat ? { categorie: cat.toLowerCase() } : {}), ...(s ? { tri: s } : {}) }).toString();
    return `/boutique${q ? `?${q}` : ""}`;
  };
  const count = (cat: Category | null) => (cat ? all.filter((p) => p.category === cat).length : all.length);
  const pill =
    "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors aria-[current=page]:border-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg";

  return (
    <>
      <section className="grid-bg relative overflow-hidden pb-14 pt-16 text-center sm:pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-80 max-w-3xl rounded-full bg-fg/[0.05] blur-[140px]" />
        <Container className="relative animate-rise">
          <Eyebrow>Boutique</Eyebrow>
          <h1 className="mt-6 text-5xl font-medium tracking-tight sm:text-6xl">Imprimé à la commande.</h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-muted">Chaque article est imprimé pour vous, dans la couleur de votre choix.</p>
        </Container>
      </section>

      <section className="theme-light pb-28">
        {/* Filtres collés en haut pendant le défilement. */}
        <div className="sticky top-16 z-30 border-b border-line bg-bg/85 backdrop-blur-xl">
          <Container className="flex flex-wrap items-center justify-between gap-3 py-3">
            <nav aria-label="Catégories" className="-mx-1 flex gap-2 overflow-x-auto px-1 py-0.5">
              {[null, ...categories].map((cat) => (
                <Link
                  key={cat ?? "tout"}
                  href={href(cat)}
                  aria-current={cat === current ? "page" : undefined}
                  className={`${pill} shrink-0 border-line-strong bg-panel-2 hover:border-fg`}
                >
                  {cat ? categoryLabel(cat) : "Tout"}
                  <span className="font-mono text-[11px] opacity-60">{count(cat)}</span>
                </Link>
              ))}
            </nav>
            <nav aria-label="Trier" className="flex items-center gap-1 whitespace-nowrap text-sm">
              <span className="mr-1 text-muted">Trier :</span>
              {sorts.map((s) => (
                <Link
                  key={s.id || "selection"}
                  href={href(current, s.id)}
                  title={s.title}
                  aria-current={s.id === sort ? "page" : undefined}
                  className="rounded-md px-2 py-1 text-muted hover:text-fg aria-[current=page]:font-medium aria-[current=page]:text-fg"
                >
                  {s.label}
                </Link>
              ))}
            </nav>
          </Container>
        </div>

        <Container className="pt-10">
          {collections.length > 0 && (
            <nav aria-label="Collections" className="mb-6 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Collections :</span>
              {collections.map((c) => (
                <Link
                  key={c.slug}
                  href={currentCollection?.slug === c.slug ? "/boutique" : `/boutique?collection=${c.slug}`}
                  aria-current={currentCollection?.slug === c.slug ? "page" : undefined}
                  className="rounded-full border border-line-strong px-3 py-1 transition hover:border-fg aria-[current=page]:border-accent aria-[current=page]:bg-accent aria-[current=page]:text-white"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
          )}
          {currentCollection?.description && <p className="-mt-2 mb-6 text-[15px] text-muted">{currentCollection.description}</p>}
          {products.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p, i) => (
                <ProductCard key={p.slug} product={p} index={i} favorite={favorites.has(p.slug)} showFavorite={authEnabled} />
              ))}
            </div>
          ) : (
            <p className="py-20 text-center text-muted">Aucun article dans cette catégorie pour l&apos;instant.</p>
          )}
          <p className="mt-12 text-center text-sm text-muted">
            Vous ne trouvez pas votre pièce ?{" "}
            <Link href="/demande?type=sur-mesure" className="font-medium text-accent underline-offset-4 hover:underline">
              On la fabrique sur mesure
            </Link>
            .
          </p>
        </Container>
      </section>
      <FinalCta />
    </>
  );
}
