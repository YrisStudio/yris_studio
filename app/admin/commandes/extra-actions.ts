"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { isAdmin } from "@/lib/admin";
import { sendShipped } from "@/lib/email";
import { carrierTrackingUrl } from "@/lib/shipping";
import { formatPrice, orderRef } from "@/lib/site";
import { REALISATIONS_BUCKET } from "@/lib/storage";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { createClient, getUser } from "@/lib/supabase/server";

export type ExtraState = { status: "idle" | "success" | "error"; message?: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function logEvent(supabase: Supabase, orderId: string, kind: string, body: string) {
  const user = await getUser();
  await supabase.from("order_events").insert({ order_id: orderId, kind, body: body.slice(0, 4000), author_email: user?.email ?? null });
}

function refresh(id: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/commandes/${id}`);
  revalidatePath("/compte");
}

// ── Photos de la pièce finie ─────────────────────────────────────────────────
// Rangées dans un espace public (realisations) : montrées au client et réutilisables pour les réseaux.
const MAX_ORDER_PHOTOS = 8;

export async function uploadOrderPhoto(id: string, formData: FormData): Promise<ExtraState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const file = formData.get("photo");
  if (!(file instanceof File) || !file.size) return { status: "error", message: "Aucune photo." };
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return { status: "error", message: "Format accepté : JPG, PNG ou WebP." };
  if (file.size > 8 * 1024 * 1024) return { status: "error", message: "Photo trop lourde (8 Mo max)." };

  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("photos").eq("id", id).maybeSingle();
  if (!order) return { status: "error", message: "Commande introuvable." };
  const photos = (order.photos ?? []) as string[];
  if (photos.length >= MAX_ORDER_PHOTOS) return { status: "error", message: `${MAX_ORDER_PHOTOS} photos maximum.` };

  const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
  const path = `${id}/${crypto.randomUUID()}.${ext}`;
  const { error: upError } = await supabase.storage.from(REALISATIONS_BUCKET).upload(path, file, { contentType: file.type });
  if (upError) {
    console.error("Photo pièce :", upError.message);
    return { status: "error", message: "Envoi impossible." };
  }
  const { error } = await supabase.from("orders").update({ photos: [...photos, path] }).eq("id", id);
  if (error) return { status: "error", message: "Photo envoyée mais pas enregistrée." };
  await logEvent(supabase, id, "note", "Photo de la pièce ajoutée");
  await logActivity("a ajouté une photo de la pièce", orderRef(id), `/admin/commandes/${id}`);
  refresh(id);
  return { status: "success" };
}

export async function removeOrderPhoto(id: string, path: string): Promise<ExtraState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("photos").eq("id", id).maybeSingle();
  const photos = (order?.photos ?? []) as string[];
  if (!photos.includes(path)) return { status: "error", message: "Photo introuvable." };
  await supabase.storage.from(REALISATIONS_BUCKET).remove([path]);
  await supabase.from("orders").update({ photos: photos.filter((p) => p !== path) }).eq("id", id);
  refresh(id);
  return { status: "success" };
}

// ── Facture : numéro définitif F-AAAA-0001, attribué une seule fois ─────────
export async function issueInvoice(id: string): Promise<ExtraState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const supabase = await createClient();
  const { data: number, error } = await supabase.rpc("issue_document", { p_order: id, p_kind: "facture" });
  if (error) return { status: "error", message: "Numéro de facture impossible." };
  await logEvent(supabase, id, "devis", `Facture ${number} émise`);
  await logActivity(`a émis la facture ${number}`, orderRef(id), `/admin/commandes/${id}`);
  refresh(id);
  return { status: "success", message: `Facture ${number}` };
}

// ── Expédition : transporteur et numéro de suivi, le client reçoit le lien ──
export async function shipOrder(id: string, _prev: ExtraState, formData: FormData): Promise<ExtraState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const carrier = String(formData.get("carrier") ?? "").trim().slice(0, 40);
  const tracking = String(formData.get("tracking") ?? "").replace(/\s+/g, "").toUpperCase().slice(0, 40);
  if (!carrier) return { status: "error", message: "Choisissez le transporteur." };
  if (tracking.length < 6) return { status: "error", message: "Numéro de suivi trop court." };

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("orders")
    .update({ carrier, tracking_number: tracking, shipped_at: now, updated_at: now })
    .eq("id", id)
    .select("customer_email, customer_name, user_id")
    .maybeSingle();
  if (error || !data) return { status: "error", message: "Impossible d'enregistrer l'envoi." };

  const url = carrierTrackingUrl(carrier, tracking);
  const mailed = await sendShipped({ orderId: id, to: data.customer_email, name: data.customer_name, carrier, tracking, trackingUrl: url, hasAccount: Boolean(data.user_id) });
  await logEvent(supabase, id, "email", `Colis expédié (${carrier} ${tracking})${mailed ? ", client prévenu" : ""}`);
  await logActivity(`a expédié la commande (${carrier})`, orderRef(id), `/admin/commandes/${id}`);
  refresh(id);
  return { status: "success", message: mailed ? "Envoi enregistré, client prévenu" : "Envoi enregistré" };
}

// ── Remboursement Stripe (total ou partiel) ──────────────────────────────────
export async function refundOrder(id: string, _prev: ExtraState, formData: FormData): Promise<ExtraState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  if (!stripeEnabled) return { status: "error", message: "Stripe n'est pas branché." };
  const raw = String(formData.get("amount") ?? "").replace(/\s|€/g, "").replace(",", ".");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("stripe_session, payment, final_cents, estimated_cents, refunded_cents")
    .eq("id", id)
    .maybeSingle();
  if (!order?.stripe_session || order.payment !== "payée") return { status: "error", message: "Cette commande n'a pas été payée en ligne." };
  const paid = order.final_cents ?? order.estimated_cents ?? 0;
  const left = paid - (order.refunded_cents ?? 0);
  const amount = raw ? Math.round(Number(raw) * 100) : left;
  if (!Number.isFinite(amount) || amount <= 0 || amount > left) return { status: "error", message: `Montant entre 0,01 € et ${formatPrice(left)}.` };

  try {
    const session = await stripe().checkout.sessions.retrieve(order.stripe_session);
    const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (!pi) return { status: "error", message: "Paiement Stripe introuvable." };
    await stripe().refunds.create({ payment_intent: pi, amount, metadata: { order_id: id, reason } });
  } catch (e) {
    console.error("Remboursement :", e instanceof Error ? e.message : e);
    return { status: "error", message: "Stripe a refusé le remboursement." };
  }
  await supabase
    .from("orders")
    .update({ refunded_cents: (order.refunded_cents ?? 0) + amount, updated_at: new Date().toISOString() })
    .eq("id", id);
  await logEvent(supabase, id, "note", `Remboursé ${formatPrice(amount)}${reason ? ` : ${reason}` : ""}`);
  await logActivity(`a remboursé ${formatPrice(amount)}`, orderRef(id), `/admin/commandes/${id}`);
  refresh(id);
  return { status: "success", message: `${formatPrice(amount)} remboursés` };
}
