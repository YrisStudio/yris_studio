import type { Metadata } from "next";
import { FinalCta, ProductCard } from "@/components/sections";
import { Container, Eyebrow } from "@/components/ui";
import { getFavoriteSlugs } from "@/lib/favorites";
import { authEnabled } from "@/lib/supabase/server";
import { products, type Category } from "@/lib/site";

export const metadata: Metadata = {
  title: "Boutique",
  description: "Pièces auto, objets pour la maison et le bureau, imprimés en 3D à la commande.",
};

const order: Category[] = ["Auto", "Maison", "Bureau", "Pratique"];

export default async function BoutiquePage() {
  const favorites = await getFavoriteSlugs();

  return (
    <>
      <section className="grid-bg relative overflow-hidden pb-20 pt-20 text-center sm:pt-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-80 max-w-3xl rounded-full bg-accent/10 blur-[140px]" />
        <Container className="relative animate-rise">
          <Eyebrow>Boutique</Eyebrow>
          <h1 className="mt-6 text-5xl font-medium tracking-tight sm:text-6xl">Imprimé à la commande.</h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-muted">
            Chaque article est imprimé pour vous. Couleur et finitions au choix.
          </p>
          <nav aria-label="Catégories" className="mt-8 flex flex-wrap justify-center gap-2">
            {order.map((cat) => (
              <a
                key={cat}
                href={`#${cat.toLowerCase()}`}
                className="rounded-lg border border-line-strong bg-panel-2 px-3.5 py-1.5 text-sm transition-colors hover:border-accent hover:text-white"
              >
                {cat === "Pratique" ? "Pièces de rechange" : cat}
              </a>
            ))}
          </nav>
        </Container>
      </section>

      <section className="theme-light pb-28 pt-8">
        <Container>
          {order.map((cat) => {
            const items = products.filter((p) => p.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat} id={cat.toLowerCase()} className="pt-16">
                <h2 data-reveal className="mb-6 font-mono text-[11px] uppercase tracking-wider text-accent">
                  {cat === "Pratique" ? "Pièces de rechange" : cat}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((p, i) => (
                    <ProductCard key={p.slug} product={p} index={i} favorite={favorites.has(p.slug)} showFavorite={authEnabled} />
                  ))}
                </div>
              </div>
            );
          })}
        </Container>
      </section>
      <FinalCta />
    </>
  );
}
