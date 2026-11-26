import { emailEnabled, escapeHtml, notifyOwner, sendRequestConfirmation } from "@/lib/email";
import { formatPrice, orderRef } from "@/lib/site";

export type ShopOrder = {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  phone: string | null;
  delivery: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  details: string | null;
  estimated_cents: number | null;
  lines: { label: string; qty: number; unit_cents: number }[] | null;
};

// Emails d'une commande boutique : à vous, puis au client.
// Avec Stripe, on attend le paiement (webhook) ; sans Stripe, on les envoie dès la commande.
export async function sendShopOrderEmails(o: ShopOrder, paid: boolean) {
  const ref = orderRef(o.id);
  const total = o.estimated_cents ?? 0;
  const lines = o.lines ?? [];
  const where = o.delivery === "retrait" ? "Retrait en main propre" : `Livraison : ${o.address}, ${o.postal_code} ${o.city}`;

  await notifyOwner({
    subject: `${paid ? "Commande payée" : "Commande boutique"} ${ref} : ${o.customer_name} (${formatPrice(total)})`,
    replyTo: o.customer_email,
    body: o.details ?? "",
    rows: [
      ["Référence", ref],
      ["Nom", o.customer_name],
      ["Email", o.customer_email],
      ["Téléphone", o.phone || "non précisé"],
      ["Réception", where],
      ["Total", formatPrice(total)],
      ["Paiement", paid ? "Payé par carte" : "À encaisser (lien de paiement à envoyer)"],
    ],
  });
  if (!emailEnabled()) return;
  const summary = [...lines.map((l) => `${l.qty} × ${l.label} · ${formatPrice(l.qty * l.unit_cents)}`), `Total : ${formatPrice(total)}`, where]
    .map(escapeHtml)
    .join("<br>");
  await sendRequestConfirmation({
    orderId: o.id,
    to: o.customer_email,
    name: o.customer_name,
    kindLabel: "Commande boutique",
    summary,
    hasAccount: Boolean(o.user_id),
    shop: true,
    paid,
  });
}
