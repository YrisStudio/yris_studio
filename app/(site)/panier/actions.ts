"use server";

import { headers } from "next/headers";
import { getProducts } from "@/lib/products";
import { sendShopOrderEmails, type ShopOrder } from "@/lib/shop-order";
import { findPromo, recordPromoUse } from "@/lib/promo";
import { formatPrice, orderRef, SHOP_SHIPPING_CENTS, site } from "@/lib/site";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { authEnabled, createClient, getUser } from "@/lib/supabase/server";

export type CheckoutState = {
  status: "idle" | "success" | "redirect" | "error";
  message?: string;
  ref?: string;
  url?: string;
  errors?: Partial<Record<"name" | "email" | "address" | "items" | "promo", string>>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valide le panier envoyé par le navigateur : les prix et noms viennent toujours de la base.
export async function checkout(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  if (String(formData.get("site_web") ?? "")) return { status: "success" };
  if (!authEnabled) return { status: "error", message: "La boutique n'est pas encore ouverte." };

  const get = (k: string) => String(formData.get(k) ?? "").trim();
  let raw: unknown;
  try {
    raw = JSON.parse(get("items") || "[]");
  } catch {
    raw = [];
  }
  const catalog = await getProducts();
  const items = (Array.isArray(raw) ? raw : [])
    .slice(0, 30)
    .map((i) => {
      const p = catalog.find((c) => c.slug === i?.slug && c.priceCents !== null);
      const qty = Math.min(Math.max(parseInt(i?.qty) || 0, 0), 20);
      const color = String(i?.color ?? "").slice(0, 40);
      return p && qty ? { product: p, qty, color: p.colors.length && !p.colors.includes(color) ? p.colors[0] : color } : null;
    })
    .filter((i) => i !== null);

  const name = get("name").slice(0, 100);
  const email = get("email").toLowerCase().slice(0, 200);
  const phone = get("phone").slice(0, 30);
  const note = get("note").slice(0, 2000);
  const delivery = get("delivery") === "retrait" ? "retrait" : "livraison";
  const address = delivery === "livraison" ? get("address").slice(0, 200) : "";
  const postalCode = delivery === "livraison" ? get("postal_code").slice(0, 12) : "";
  const city = delivery === "livraison" ? get("city").slice(0, 100) : "";

  const errors: CheckoutState["errors"] = {};
  if (!items.length) errors.items = "Votre panier est vide.";
  if (name.length < 2) errors.name = "Indiquez votre nom.";
  if (!EMAIL_RE.test(email)) errors.email = "Cette adresse email ne semble pas valide.";
  if (delivery === "livraison" && (address.length < 5 || !postalCode || city.length < 2))
    errors.address = "Indiquez l'adresse complète (rue, code postal et ville), ou choisissez le retrait.";
  if (Object.keys(errors).length) return { status: "error", errors };

  const label = (i: (typeof items)[number]) => `${i.product.name}${i.color ? ` (${i.color})` : ""}`;
  const lines = items.map((i) => ({ label: label(i), qty: i.qty, unit_cents: i.product.priceCents! }));
  const shipping = delivery === "livraison" ? SHOP_SHIPPING_CENTS : 0;
  if (shipping) lines.push({ label: "Livraison", qty: 1, unit_cents: shipping });
  const subtotal = items.reduce((n, i) => n + i.qty * i.product.priceCents!, 0);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const user = await getUser();

  // Code promo (ou de parrainage) : toujours revérifié ici, sur le prix des articles (hors livraison).
  const promo = await findPromo(get("promo"), subtotal, email);
  if (get("promo") && !promo) return { status: "error", errors: { promo: "Ce code n'est pas valable pour ce panier." } };
  const discount = promo?.discount_cents ?? 0;
  const total = lines.reduce((n, l) => n + l.qty * l.unit_cents, 0) - discount;
  const summaryText = [...items.map((i) => `${i.qty} × ${label(i)}`), ...(promo ? [`Code ${promo.code} : −${formatPrice(discount)}`] : [])].join("\n");
  const orderId = crypto.randomUUID();
  const ref = orderRef(orderId);
  const order: ShopOrder = {
    id: orderId,
    user_id: user?.id ?? null,
    customer_name: name,
    customer_email: email,
    phone: phone || null,
    delivery,
    address: address || null,
    postal_code: postalCode || null,
    city: city || null,
    details: `${summaryText}${note ? `\n\nNote du client : ${note}` : ""}`,
    estimated_cents: total,
    lines,
  };
  const extra = {
    items: items.map((i) => ({ slug: i.product.slug, name: i.product.name, color: i.color, qty: i.qty, unit_cents: i.product.priceCents! })),
    promo_code: promo?.code ?? null,
    discount_cents: discount || null,
  };

  // Paiement par carte : on crée la page de paiement Stripe avant d'enregistrer la commande,
  // pour y noter son identifiant. La commande passe « payée » quand Stripe prévient le webhook.
  let session: { id: string; url: string | null } | null = null;
  if (stripeEnabled) {
    // Retour sur le même site que le client (yris-studio.com, ou localhost pendant les tests).
    const from = (await headers()).get("origin") ?? "";
    const origin = /^https:\/\/(www\.)?yris-studio\.com$|^http:\/\/localhost:\d+$/.test(from) ? from : site.url;
    try {
      // La réduction devient un bon Stripe à usage unique, appliqué à cette page de paiement.
      const coupon = discount
        ? await stripe().coupons.create({ amount_off: discount, currency: "eur", duration: "once", max_redemptions: 1, name: `Code ${promo!.code}` })
        : null;
      session = await stripe().checkout.sessions.create({
        ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
        mode: "payment",
        locale: "fr",
        customer_email: email,
        client_reference_id: orderId,
        metadata: { order_id: orderId, ref, ...(promo ? { promo: promo.code } : {}) },
        payment_intent_data: { description: `Commande ${ref}`, metadata: { order_id: orderId } },
        line_items: lines.map((l) => ({
          quantity: l.qty,
          price_data: { currency: "eur", unit_amount: l.unit_cents, product_data: { name: l.label } },
        })),
        // 30 minutes : le minimum accepté par Stripe. Au-delà, la commande est abandonnée.
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: `${origin}/panier/merci?ref=${encodeURIComponent(ref)}`,
        cancel_url: `${origin}/panier?paiement=annule`,
      });
    } catch (e) {
      console.error("Stripe : création du paiement impossible", e instanceof Error ? e.message : e);
      return { status: "error", message: "Le paiement n'a pas pu démarrer. Réessayez dans un instant." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("orders").insert({
    ...order,
    kind: "commande",
    product_slug: items[0].product.slug,
    product_name: items.length === 1 ? items[0].product.name : `Panier : ${count} articles`,
    quantity: count,
    material: [...new Set(items.map((i) => i.product.material))].join(", "),
    files: [],
    ...extra,
    ...(session ? { payment: "en attente", stripe_session: session.id } : {}),
  });
  if (error) {
    console.error("Panier : enregistrement impossible", error.message);
    return { status: "error", message: "La commande n'a pas pu être enregistrée. Réessayez dans un instant." };
  }

  if (session?.url) return { status: "redirect", url: session.url, ref };
  await sendShopOrderEmails(order, false);
  if (promo) await recordPromoUse(promo.code, orderId, email);
  return { status: "success", ref };
}

// Vérifie un code depuis le panier (avant de payer), pour afficher la réduction.
export async function checkPromo(code: string, subtotal: number, email: string) {
  const promo = await findPromo(code, Math.max(0, Math.round(subtotal)), email);
  return promo ? { code: promo.code, discountCents: promo.discount_cents, label: promo.label } : null;
}
