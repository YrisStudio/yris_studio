"use server";

import { emailEnabled, escapeHtml, notifyOwner, sendRequestConfirmation } from "@/lib/email";
import { getProducts } from "@/lib/products";
import { formatPrice, orderRef, SHOP_SHIPPING_CENTS } from "@/lib/site";
import { authEnabled, createClient, getUser } from "@/lib/supabase/server";

export type CheckoutState = {
  status: "idle" | "success" | "error";
  message?: string;
  ref?: string;
  errors?: Partial<Record<"name" | "email" | "address" | "items", string>>;
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
  const total = lines.reduce((n, l) => n + l.qty * l.unit_cents, 0);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const summaryText = items.map((i) => `${i.qty} × ${label(i)}`).join("\n");

  const user = await getUser();
  const orderId = crypto.randomUUID();
  const supabase = await createClient();
  const { error } = await supabase.from("orders").insert({
    id: orderId,
    user_id: user?.id ?? null,
    customer_name: name,
    customer_email: email,
    phone: phone || null,
    delivery,
    address: address || null,
    postal_code: postalCode || null,
    city: city || null,
    kind: "commande",
    product_slug: items[0].product.slug,
    product_name: items.length === 1 ? items[0].product.name : `Panier : ${count} articles`,
    quantity: count,
    material: [...new Set(items.map((i) => i.product.material))].join(", "),
    details: `${summaryText}${note ? `\n\nNote du client : ${note}` : ""}`,
    files: [],
    estimated_cents: total,
    lines,
  });
  if (error) {
    console.error("Panier : enregistrement impossible", error.message);
    return { status: "error", message: "La commande n'a pas pu être enregistrée. Réessayez dans un instant." };
  }

  const ref = orderRef(orderId);
  const where = delivery === "retrait" ? "Retrait en main propre" : `Livraison : ${address}, ${postalCode} ${city}`;
  await notifyOwner({
    subject: `Commande boutique ${ref} : ${name} (${formatPrice(total)})`,
    replyTo: email,
    body: `${summaryText}${note ? `\n\nNote : ${note}` : ""}`,
    rows: [
      ["Référence", ref],
      ["Nom", name],
      ["Email", email],
      ["Téléphone", phone || "non précisé"],
      ["Réception", where],
      ["Total", formatPrice(total)],
    ],
  });
  if (emailEnabled()) {
    const summary = [...lines.map((l) => `${l.qty} × ${l.label} · ${formatPrice(l.qty * l.unit_cents)}`), `Total : ${formatPrice(total)}`, where]
      .map(escapeHtml)
      .join("<br>");
    await sendRequestConfirmation({ orderId, to: email, name, kindLabel: "Commande boutique", summary, hasAccount: Boolean(user), shop: true });
  }

  return { status: "success", ref };
}
