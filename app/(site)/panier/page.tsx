import type { Metadata } from "next";
import CartView from "./CartView";
import { Container } from "@/components/ui";
import { getProducts } from "@/lib/products";
import { SHOP_SHIPPING_CENTS } from "@/lib/site";
import { stripeEnabled } from "@/lib/stripe";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Panier", robots: { index: false } };

export default async function CartPage({ searchParams }: { searchParams: Promise<{ paiement?: string }> }) {
  const { paiement } = await searchParams;
  const [products, user] = await Promise.all([getProducts(), getUser()]);
  // Le navigateur ne reçoit que ce qu'il faut pour afficher le panier.
  const catalog = products
    .filter((p) => p.priceCents !== null)
    .map((p) => ({ slug: p.slug, name: p.name, priceCents: p.priceCents!, photo: p.photos[0] ?? null, colors: p.colors, category: p.category }));

  return (
    <div className="theme-light min-h-[70vh]">
      <Container className="pb-24 pt-10 sm:pt-14">
        <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">Panier</h1>
        <CartView
          catalog={catalog}
          shippingCents={SHOP_SHIPPING_CENTS}
          payOnline={stripeEnabled}
          cancelled={paiement === "annule"}
          user={user ? { name: String(user.user_metadata?.full_name ?? ""), email: user.email ?? "" } : null}
        />
      </Container>
    </div>
  );
}
