"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { companyFields, sanitizeCompany } from "@/lib/company";
import { quoteMaterials, sanitizeTariffs } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { status: "idle" | "success" | "error"; message?: string };

// « 25,90 » → 2590 centimes. Vide ou invalide → undefined (valeur par défaut gardée).
const euros = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/\s|€/g, "").replace(",", "."));
  return String(v ?? "").trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
};
const number = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return String(v ?? "").trim() && Number.isFinite(n) && n >= 0 ? n : undefined;
};

export async function saveTariffs(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const tariffs = sanitizeTariffs({
    materials: Object.fromEntries(quoteMaterials.map((m) => [m, euros(formData.get(`mat_${m}`))])),
    machineHourCents: euros(formData.get("machine")),
    laborHourCents: euros(formData.get("labor")),
    marginPct: number(formData.get("margin")),
    wastePct: number(formData.get("waste")),
    minimumCents: euros(formData.get("minimum")),
    shippingCents: euros(formData.get("shipping")),
  });

  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_settings")
    .upsert({ key: "tariffs", value: tariffs, updated_at: new Date().toISOString() });
  if (error) {
    console.error("Tarifs :", error.message);
    return { status: "error", message: "Impossible d'enregistrer les tarifs." };
  }
  revalidatePath("/admin", "layout");
  return { status: "success", message: "Tarifs enregistrés" };
}

// Remise à zéro des chiffres : les ventes terminées avant cette date ne comptent plus (rien n'est supprimé).
export async function setStatsReset(reset: boolean): Promise<SettingsState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const supabase = await createClient();
  // Annuler = valeur vide (getStatsResetAt n'y voit alors aucune date).
  const now = new Date().toISOString();
  const { error } = await supabase.from("admin_settings").upsert({ key: "stats_reset_at", value: reset ? now : null, updated_at: now });
  if (error) {
    console.error("Remise à zéro :", error.message);
    return { status: "error", message: "Impossible de modifier les chiffres." };
  }
  revalidatePath("/admin", "layout");
  return { status: "success", message: reset ? "Chiffres remis à zéro" : "Tous les chiffres sont de retour" };
}

export async function saveCompany(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const company = sanitizeCompany(Object.fromEntries(companyFields.map(({ key }) => [key, String(formData.get(key) ?? "")])));
  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_settings")
    .upsert({ key: "company", value: company, updated_at: new Date().toISOString() });
  if (error) {
    console.error("Entreprise :", error.message);
    return { status: "error", message: "Impossible d'enregistrer les infos." };
  }
  revalidatePath("/admin", "layout");
  return { status: "success", message: "Infos enregistrées" };
}
