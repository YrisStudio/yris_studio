import { sendReferralReward } from "@/lib/email";
import { formatPrice } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const REFERRAL_PERCENT = 10; // réduction du filleul sur sa première commande
export const REFERRAL_REWARD_CENTS = 500; // bon offert au parrain

const canWrite = () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

// Réduction d'un code pour un panier (vérifiée par la base, sans exposer la liste des codes).
export async function findPromo(code: string, subtotalCents: number, email: string) {
  const clean = code.trim().toUpperCase();
  if (clean.length < 3) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("promo_discount", { p_code: clean, p_subtotal: subtotalCents, p_email: email });
  if (error) console.error("Code promo :", error.message);
  const row = (data as { code: string; discount_cents: number; label: string }[] | null)?.[0];
  return row && row.discount_cents > 0 ? row : null;
}

// Commande payée avec un code : on compte l'utilisation. Si c'est un code de parrainage et la
// première commande payée de ce client, le parrain reçoit son bon de 5 € par email.
export async function recordPromoUse(code: string, orderId: string, buyerEmail: string) {
  if (!canWrite()) return;
  const db = createServiceClient();
  const { data: promo } = await db.from("promo_codes").select("code, uses, owner_email").eq("code", code).maybeSingle();
  if (!promo) return;
  await db.from("promo_codes").update({ uses: promo.uses + 1 }).eq("code", code);
  if (!promo.owner_email) return;

  const { count } = await db
    .from("orders")
    .select("id", { count: "exact", head: true })
    .ilike("customer_email", buyerEmail)
    .eq("payment", "payée")
    .neq("id", orderId);
  if ((count ?? 0) > 0) return;

  const reward = `MERCI-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const { error } = await db.from("promo_codes").insert({
    code: reward,
    kind: "montant",
    value: REFERRAL_REWARD_CENTS,
    max_uses: 1,
    reward_for: code,
    note: `Parrainage : ${buyerEmail}`,
  });
  if (error) return console.error("Parrainage :", error.message);
  await sendReferralReward({ to: promo.owner_email, code: reward, amountLabel: formatPrice(REFERRAL_REWARD_CENTS) });
  await db.from("admin_activity").insert({ actor: null, action: `a déclenché un bon de parrainage (${reward})`, target: promo.owner_email, link: "/admin/promos" });
}

// Code de parrainage d'un client (créé à la première visite de son compte).
export async function getReferralCode(email: string) {
  if (!canWrite()) return null;
  const db = createServiceClient();
  const { data } = await db.from("promo_codes").select("code, uses").eq("owner_email", email.toLowerCase()).maybeSingle();
  if (data) return data;
  const base = email.split("@")[0].normalize("NFD").replace(/[^A-Za-z]/g, "").slice(0, 8).toUpperCase() || "AMI";
  const code = `${base}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  const { error } = await db.from("promo_codes").insert({ code, kind: "pourcent", value: REFERRAL_PERCENT, owner_email: email.toLowerCase(), note: "Code de parrainage" });
  if (error) {
    console.error("Parrainage :", error.message);
    return null;
  }
  return { code, uses: 0 };
}
