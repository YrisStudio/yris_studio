"use server";

import { revalidatePath } from "next/cache";
import { getAssignees, isAdmin } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { sendStatusUpdate } from "@/lib/email";
import { realisationUrl } from "@/lib/storage";
import { computeQuote, sanitizeInputs, type QuoteInputs } from "@/lib/pricing";
import { getTariffs } from "@/lib/settings";
import { formatPrice, orderRef, orderStatuses, type OrderStatus } from "@/lib/site";
import { createClient, getUser } from "@/lib/supabase/server";
import { statusMeta } from "@/lib/orders-meta";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function logEvent(supabase: Supabase, orderId: string, kind: string, body: string) {
  const user = await getUser();
  const { error } = await supabase
    .from("order_events")
    .insert({ order_id: orderId, kind, body: body.slice(0, 4000), author_email: user?.email ?? null });
  if (error) console.error("Historique :", error.message);
}

function refresh(id?: string) {
  revalidatePath("/admin", "layout");
  if (id) revalidatePath(`/admin/commandes/${id}`);
  revalidatePath("/compte");
}

// Change le statut (glisser-déposer du Kanban ou fiche commande) et prévient le client par email.
export async function setOrderStatus(id: string, status: string): Promise<ActionState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  if (!(orderStatuses as readonly string[]).includes(status)) return { status: "error", message: "Statut inconnu." };

  const supabase = await createClient();
  const { data: before } = await supabase.from("orders").select("status").eq("id", id).maybeSingle();
  if (!before) return { status: "error", message: "Commande introuvable." };
  if (before.status === status) return { status: "success" };

  const { data, error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("customer_email, customer_name, user_id, final_cents, estimated_cents, photos")
    .maybeSingle();
  if (error || !data) {
    console.error("Statut :", error?.message);
    return { status: "error", message: "Impossible de changer le statut." };
  }

  const from = statusMeta[before.status as OrderStatus]?.label ?? before.status;
  const to = statusMeta[status as OrderStatus].label;
  await logEvent(supabase, id, "statut", `${from} → ${to}`);
  await logActivity(`a passé la commande en « ${to} »`, orderRef(id), `/admin/commandes/${id}`);
  // Commande terminée : la facture reçoit son numéro définitif (F-2026-0001).
  if (status === "terminée") {
    const { error: invError } = await supabase.rpc("issue_document", { p_order: id, p_kind: "facture" });
    if (invError) console.error("Facture :", invError.message);
  }

  const cents = data.final_cents ?? data.estimated_cents;
  const mailed = await sendStatusUpdate({
    orderId: id,
    to: data.customer_email,
    name: data.customer_name,
    status,
    priceLabel: cents !== null ? formatPrice(cents) : null,
    hasAccount: Boolean(data.user_id),
    photos: ((data.photos ?? []) as string[]).map(realisationUrl),
  });
  if (mailed) await logEvent(supabase, id, "email", `Client prévenu : « ${to} »`);

  refresh(id);
  return { status: "success", message: mailed ? "Statut changé, client prévenu" : "Statut changé" };
}

// Priorité, date promise et prix final ajusté à la main.
export async function updateOrderMeta(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const priority = formData.get("priority") === "urgente" ? "urgente" : "normale";
  const due = String(formData.get("due_date") ?? "");
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return { status: "error", message: "Date invalide." };

  const rawPrice = String(formData.get("final_price") ?? "").replace(/\s|€/g, "").replace(",", ".");
  let finalCents: number | null = null;
  if (rawPrice) {
    const n = Number(rawPrice);
    if (!Number.isFinite(n) || n < 0 || n > 100000) return { status: "error", message: "Prix invalide. Exemple : 24,90" };
    finalCents = Math.round(n * 100);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ priority, due_date: due || null, final_cents: finalCents, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("Commande :", error.message);
    return { status: "error", message: "Impossible d'enregistrer." };
  }
  refresh(id);
  return { status: "success", message: "Enregistré" };
}

// Note interne (jamais visible par le client).
export async function addOrderNote(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const body = String(formData.get("note") ?? "").trim();
  if (!body) return { status: "error", message: "Écrivez la note." };
  const supabase = await createClient();
  await logEvent(supabase, id, "note", body);
  refresh(id);
  return { status: "success", message: "Note ajoutée" };
}

// Enregistre le devis calculé (et l'envoie au client si demandé). Le calcul est refait ici,
// avec les tarifs enregistrés : le navigateur ne fait que proposer les valeurs saisies.
export async function saveQuote(id: string, raw: Partial<QuoteInputs>, send: boolean): Promise<ActionState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const inputs = sanitizeInputs(raw);
  const quote = computeQuote(inputs, await getTariffs());

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({
      quote_inputs: inputs,
      lines: quote.lines,
      final_cents: quote.totalCents,
      material: inputs.material,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("Devis :", error.message);
    return { status: "error", message: "Impossible d'enregistrer le devis." };
  }

  if (!send) {
    await logEvent(supabase, id, "devis", `Devis calculé : ${formatPrice(quote.totalCents)}`);
    refresh(id);
    return { status: "success", message: "Devis enregistré" };
  }

  // Numéro de devis officiel (D-2026-0001), attribué une seule fois par la base.
  const { data: number, error: numError } = await supabase.rpc("issue_document", { p_order: id, p_kind: "devis" });
  if (numError) console.error("Numéro de devis :", numError.message);
  await logEvent(supabase, id, "devis", `Devis ${number ?? ""} envoyé : ${formatPrice(quote.totalCents)}`.replace("  ", " "));
  await logActivity(`a envoyé le devis ${number ?? ""} (${formatPrice(quote.totalCents)})`, orderRef(id), `/admin/commandes/${id}`);
  const res = await setOrderStatus(id, "devis envoyé");
  refresh(id);
  return res.status === "error" ? res : { status: "success", message: res.message?.includes("prévenu") ? "Devis envoyé au client" : "Devis prêt (email non envoyé)" };
}

// Confie la commande à un membre de l'équipe (ou à personne) et le note dans l'historique.
export async function assignOrder(id: string, who: string): Promise<ActionState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const assignee = who ? ((await getAssignees()).includes(who) ? who : undefined) : null;
  if (assignee === undefined) return { status: "error", message: "Personne inconnue dans l'équipe." };
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ assigned_to: assignee }).eq("id", id);
  if (error) {
    console.error("Assignation :", error.message);
    return { status: "error", message: "Impossible d'assigner la commande." };
  }
  await logEvent(supabase, id, "note", assignee ? `Confiée à ${assignee}` : "Plus assignée");
  await logActivity(assignee ? `a confié la commande à ${assignee}` : "a retiré l'assignation de la commande", orderRef(id), `/admin/commandes/${id}`);
  refresh(id);
  revalidatePath("/admin/todo");
  return { status: "success" };
}
