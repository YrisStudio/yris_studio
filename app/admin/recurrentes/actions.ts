"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { isAdmin } from "@/lib/admin";
import { formatPrice, orderRef } from "@/lib/site";
import { createClient, getUser } from "@/lib/supabase/server";

export type RecurringState = { status: "idle" | "success" | "error"; message?: string };
type Line = { label: string; qty: number; unit_cents: number };

const refresh = () => {
  revalidatePath("/admin/recurrentes");
  revalidatePath("/admin", "layout");
};

// Ajoute des mois à une date AAAA-MM-JJ (le 31 devient le dernier jour du mois si besoin).
function addMonths(date: string, months: number) {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

export async function saveRecurring(_prev: RecurringState, formData: FormData): Promise<RecurringState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const email = get("customer_email").toLowerCase();
  const title = get("title").slice(0, 200);
  const qty = Math.min(Math.max(parseInt(get("qty")) || 1, 1), 10000);
  const unit = Math.round(Number(get("unit").replace(/\s|€/g, "").replace(",", ".")) * 100);
  const every = Math.min(Math.max(parseInt(get("every_months")) || 1, 1), 12);
  const next = get("next_on");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", message: "Email du client invalide." };
  if (!title) return { status: "error", message: "Décris la commande (ex. 200 clips pour le garage)." };
  if (!Number.isFinite(unit) || unit < 0) return { status: "error", message: "Prix unitaire invalide." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return { status: "error", message: "Date de la prochaine commande invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("recurring_orders").insert({
    customer_email: email,
    customer_name: get("customer_name").slice(0, 100) || null,
    customer_company: get("customer_company").slice(0, 120) || null,
    title,
    lines: [{ label: title, qty, unit_cents: unit }],
    every_months: every,
    next_on: next,
    notes: get("notes").slice(0, 2000) || null,
  });
  if (error) {
    console.error("Récurrente :", error.message);
    return { status: "error", message: "Impossible d'enregistrer." };
  }
  await logActivity("a créé une commande récurrente", title, "/admin/recurrentes");
  refresh();
  return { status: "success", message: "Commande récurrente enregistrée" };
}

// Crée la vraie commande à partir du modèle, puis avance la prochaine date.
export async function generateOrder(id: string): Promise<RecurringState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const supabase = await createClient();
  const { data: r } = await supabase.from("recurring_orders").select("*").eq("id", id).maybeSingle();
  if (!r) return { status: "error", message: "Introuvable." };
  const lines = (r.lines ?? []) as Line[];
  const total = lines.reduce((n, l) => n + l.qty * l.unit_cents, 0);
  const orderId = crypto.randomUUID();

  const { error } = await supabase.from("orders").insert({
    id: orderId,
    kind: "projet",
    customer_name: r.customer_name,
    customer_email: r.customer_email,
    customer_company: r.customer_company,
    product_name: r.title,
    quantity: Math.min(1000, lines.reduce((n, l) => n + l.qty, 0) || 1),
    details: `Commande récurrente (tous les ${r.every_months} mois).${r.notes ? `\n\n${r.notes}` : ""}`,
    files: [],
    estimated_cents: total,
    lines,
  });
  if (error) {
    console.error("Récurrente → commande :", error.message);
    return { status: "error", message: "Impossible de créer la commande." };
  }
  // Prix connu d'avance : il devient le prix final (la création publique ne peut pas le fixer).
  await supabase.from("orders").update({ final_cents: total }).eq("id", orderId);
  const user = await getUser();
  await supabase.from("order_events").insert({ order_id: orderId, kind: "creation", body: "Créée depuis une commande récurrente.", author_email: user?.email ?? null });
  await supabase.from("recurring_orders").update({ next_on: addMonths(r.next_on, r.every_months) }).eq("id", id);
  await logActivity(`a créé la commande récurrente (${formatPrice(total)})`, `${orderRef(orderId)} · ${r.customer_company ?? r.customer_name ?? r.customer_email}`, `/admin/commandes/${orderId}`);
  refresh();
  return { status: "success", message: `Commande ${orderRef(orderId)} créée` };
}

export async function toggleRecurring(id: string, active: boolean) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  await supabase.from("recurring_orders").update({ active }).eq("id", id);
  refresh();
}

export async function deleteRecurring(id: string) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  await supabase.from("recurring_orders").delete().eq("id", id);
  refresh();
}
