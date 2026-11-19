"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export type GoalState = { status: "idle" | "success" | "error"; message?: string };

// Objectif de chiffre d'affaires du mois (Tableau de bord).
export async function setMonthlyGoal(_prev: GoalState, formData: FormData): Promise<GoalState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const raw = String(formData.get("goal") ?? "").replace(/\s|€/g, "").replace(",", ".");
  const euros = raw ? Number(raw) : 0;
  if (!Number.isFinite(euros) || euros < 0 || euros > 1_000_000) return { status: "error", message: "Montant invalide." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_settings")
    .upsert({ key: "monthly_goal_cents", value: Math.round(euros * 100), updated_at: new Date().toISOString() });
  if (error) {
    console.error("Objectif :", error.message);
    return { status: "error", message: "Impossible d'enregistrer l'objectif." };
  }
  revalidatePath("/admin");
  return { status: "success", message: "Objectif enregistré" };
}
