"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { isAdmin, isManager } from "@/lib/admin";
import { expenseCategories, sanitizeFinance } from "@/lib/finance";
import { formatPrice } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export type FinanceState = { status: "idle" | "success" | "error"; message?: string };

const refresh = () => {
  revalidatePath("/admin/finances");
  revalidatePath("/admin");
};

export async function addExpense(_prev: FinanceState, formData: FormData): Promise<FinanceState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const label = get("label").slice(0, 200);
  const category = get("category");
  const date = get("spent_on");
  const amount = Math.round(Number(get("amount").replace(/\s|€/g, "").replace(",", ".")) * 100);
  const receipt = get("receipt_path");
  const orderId = get("order_id");
  if (!label) return { status: "error", message: "Indique ce qui a été acheté." };
  if (!(expenseCategories as readonly string[]).includes(category)) return { status: "error", message: "Choisis une catégorie." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { status: "error", message: "Date invalide." };
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return { status: "error", message: "Montant invalide (ex. 24,90)." };
  if (receipt && !/^[0-9a-f-]{36}\/[\w.-]{1,120}$/i.test(receipt)) return { status: "error", message: "Ticket invalide." };
  if (orderId && !/^[0-9a-f-]{36}$/i.test(orderId)) return { status: "error", message: "Commande invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    label,
    category,
    spent_on: date,
    amount_cents: amount,
    supplier: get("supplier").slice(0, 120) || null,
    receipt_path: receipt || null,
    order_id: orderId || null,
  });
  if (error) {
    console.error("Dépense :", error.message);
    return { status: "error", message: "Impossible d'enregistrer la dépense." };
  }
  await logActivity(`a ajouté une dépense de ${formatPrice(amount)}`, label, "/admin/finances");
  refresh();
  return { status: "success", message: "Dépense ajoutée" };
}

export async function deleteExpense(id: string) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  const { data } = await supabase.from("expenses").delete().eq("id", id).select("label, receipt_path").maybeSingle();
  if (data?.receipt_path) await supabase.storage.from("tickets").remove([data.receipt_path]);
  if (data) await logActivity("a supprimé la dépense", data.label, "/admin/finances");
  refresh();
}

export async function saveFinanceSettings(_prev: FinanceState, formData: FormData): Promise<FinanceState> {
  if (!(await isManager())) return { status: "error", message: "Réservé aux gérants." };
  const num = (k: string) => Number(String(formData.get(k) ?? "").replace(",", "."));
  const value = sanitizeFinance({
    urssafPeriod: formData.get("urssafPeriod"),
    urssafRatePct: num("urssafRatePct"),
    liberatoirePct: num("liberatoirePct"),
  });
  const supabase = await createClient();
  const { error } = await supabase.from("admin_settings").upsert({ key: "finance", value, updated_at: new Date().toISOString() });
  if (error) return { status: "error", message: "Impossible d'enregistrer." };
  refresh();
  return { status: "success", message: "Réglages enregistrés" };
}
