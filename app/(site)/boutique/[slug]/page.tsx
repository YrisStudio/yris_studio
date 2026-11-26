import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, Flame, Layers, Truck } from "lucide-react";
import BuyBox from "./BuyBox";
import Gallery from "./Gallery";
import { ProductCard } from "@/components/sections";
import { Container, Mono } from "@/components/ui";
import { getProduct, getProducts } from "@/lib/products";
import { categoryLabel, formatPrice, materials, site } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Article introuvable" };
  return {
    title: product.name,
    description: product.text,
    openGraph: product.photos[0] ? { images: [product.photos[0]] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const all = await getProducts();
  const related = [...all.filter((p) => p.category === product.category && p.slug !== slug), ...all.filter((p) => p.category !== product.category)].slice(0, 3);
  const heat = materials.find((m) => m.name === product.material)?.heat;
  const facts = [
    { icon: Layers, label: "Matière", value: product.material },
    ...(heat ? [{ icon: Flame, label: "Résiste", value: heat }] : []),
    {
      icon: Clock,
      label: product.stockQty > 0 ? "Disponibilité" : "Fabrication",
      value:
        product.stockQty > 0
          ? "En stock, expédié sous 24 h"
          : product.leadDays
            ? `${product.leadDays} jour${product.leadDays > 1 ? "s" : ""} ouvré${product.leadDays > 1 ? "s" : ""}`
            : "Prêt à partir",
    },
    { icon: Truck, label: "Réception", value: "Livraison ou retrait" },
  ];

  // Données structurées : Google peut afficher le prix dans ses résultats.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.text,
    image: product.photos,
    brand: { "@type": "Brand", name: "Yris Studio" },
    ...(product.priceCents !== null && {
      offers: {
        "@type": "Offer",
        price: (product.priceCents / 100).toFixed(2),
        priceCurrency: "EUR",
        availability: product.stockQty > 0 ? "https://schema.org/InStock" : "https://schema.org/MadeToOrder",
        url: `${site.url}/boutique/${product.slug}`,
      },
    }),
  };

  return (
    <div className="theme-light">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Container className="pb-24 pt-8 sm:pt-12">
        <nav aria-label="Fil d'Ariane" className="mb-6 flex items-center gap-1 text-sm text-muted">
          <ChevronLeft size={15} aria-hidden />
          <Link href="/boutique" className="hover:text-fg">
            Boutique
          </Link>
          <span aria-hidden>/</span>
          <Link href={`/boutique?categorie=${product.category.toLowerCase()}`} className="hover:text-fg">
            {categoryLabel(product.category)}
          </Link>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <Gallery photos={product.photos} name={product.name} category={product.category} />

          <div className="lg:pt-2">
            <Mono>
              {categoryLabel(product.category)} · {product.material}
            </Mono>
            <h1 className="mt-2 text-4xl font-medium tracking-tight sm:text-5xl">{product.name}</h1>
            <p className={`mt-4 font-mono text-2xl ${product.priceCents === null ? "text-muted" : ""}`}>{formatPrice(product.priceCents)}</p>
            {product.text && <p className="mt-4 text-[15px] leading-relaxed text-fg/80">{product.text}</p>}

            <BuyBox slug={product.slug} priceCents={product.priceCents} colors={product.colors} />

            <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
              {facts.map((f) => (
                <div key={f.label} className="flex items-start gap-3 bg-panel-2 p-4">
                  <f.icon size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                  <div>
                    <dt className="font-mono text-[10.5px] uppercase tracking-wider text-muted">{f.label}</dt>
                    <dd className="mt-0.5 text-sm">{f.value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            {product.description && (
              <div className="mt-10">
                <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted">Description</h2>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-fg/85">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-24">
            <h2 className="mb-6 text-2xl font-medium tracking-tight">Vous aimerez aussi</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p, i) => (
                <ProductCard key={p.slug} product={p} index={i} showFavorite={false} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </div>
  );
}
