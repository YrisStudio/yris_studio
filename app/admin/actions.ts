"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

// Ordre du suivi : un clic fait passer la commande à l'étape suivante.
const nextStatus: Record<string, string> = {
  reçue: "devis envoyé",
  "devis envoyé": "en impression",
  "en impression": "terminée",
};

export async function advanceOrder(id: string, current: string) {
  if (!(await isAdmin())) return;
  const status = nextStatus[current];
  if (!status) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", current);
  if (error) console.error("File d'impression :", error.message);
  revalidatePath("/admin", "layout");
  revalidatePath("/compte");
}

export async function setMonthlyGoal(formData: FormData) {
  if (!(await isAdmin())) return;
  const euros = Number(String(formData.get("goal") ?? "").replace(/\s|€/g, "").replace(",", "."));
  if (!Number.isFinite(euros) || euros < 0 || euros > 1_000_000) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_settings")
    .upsert({ key: "monthly_goal_cents", value: Math.round(euros * 100), updated_at: new Date().toISOString() });
  if (error) console.error("Objectif :", error.message);
  revalidatePath("/admin");
}
