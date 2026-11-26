import type Stripe from "stripe";
import { recordPromoUse } from "@/lib/promo";
import { sendShopOrderEmails, type ShopOrder } from "@/lib/shop-order";
import { orderRef } from "@/lib/site";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Stripe appelle cette adresse après chaque paiement (ou abandon).
// La signature prouve que l'appel vient bien de Stripe : sans elle, on ignore tout.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Signature manquante", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch (e) {
    console.error("Webhook Stripe : signature invalide", e instanceof Error ? e.message : e);
    return new Response("Signature invalide", { status: 400 });
  }

  const supabase = createServiceClient();

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    if (session.payment_status !== "paid") return Response.json({ ok: true });

    // Ne change que la commande encore « en attente » : si Stripe renvoie l'événement, rien n'est fait deux fois.
    const { data, error } = await supabase
      .from("orders")
      .update({ payment: "payée", paid_at: new Date().toISOString(), final_cents: session.amount_total })
      .eq("stripe_session", session.id)
      .eq("payment", "en attente")
      .select("id, user_id, customer_name, customer_email, phone, delivery, address, postal_code, city, details, estimated_cents, lines, items, promo_code")
      .maybeSingle();
    if (error) {
      console.error("Webhook Stripe : mise à jour impossible", error.message);
      return new Response("Erreur base", { status: 500 });
    }
    if (data) {
      await supabase.from("order_events").insert({
        order_id: data.id,
        kind: "statut",
        body: `Paiement reçu par carte (${((session.amount_total ?? 0) / 100).toFixed(2).replace(".", ",")} €)`,
        author_email: null,
      });
      await sendShopOrderEmails(data as ShopOrder, true);
      // Facture définitive, stock des pièces déjà imprimées, code promo, journal.
      const { error: invError } = await supabase.rpc("issue_document", { p_order: data.id, p_kind: "facture" });
      if (invError) console.error("Webhook Stripe : facture", invError.message);
      for (const item of (data.items ?? []) as { slug: string; qty: number }[]) {
        const { data: p } = await supabase.from("products").select("stock_qty").eq("slug", item.slug).maybeSingle();
        if (p && p.stock_qty > 0) await supabase.from("products").update({ stock_qty: Math.max(0, p.stock_qty - item.qty) }).eq("slug", item.slug);
      }
      if (data.promo_code) await recordPromoUse(data.promo_code, data.id, data.customer_email);
      await supabase.from("admin_activity").insert({
        actor: null,
        action: `a payé ${((session.amount_total ?? 0) / 100).toFixed(2).replace(".", ",")} € par carte`,
        target: `${orderRef(data.id)} · ${data.customer_name}`,
        link: `/admin/commandes/${data.id}`,
      });
    }
  }

  if (event.type === "checkout.session.expired") {
    // Le client n'a jamais payé : la commande disparaît du gestionnaire.
    await supabase.from("orders").update({ payment: "abandonnée", status: "annulée" }).eq("stripe_session", event.data.object.id).eq("payment", "en attente");
  }

  return Response.json({ ok: true });
}
