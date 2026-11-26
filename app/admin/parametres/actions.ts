"use server";

import { revalidatePath } from "next/cache";
import { getMe, isManager } from "@/lib/admin";
import { roles } from "@/lib/team";
import { companyFields, sanitizeCompany } from "@/lib/company";
import { quoteMaterials, sanitizeTariffs } from "@/lib/pricing";
import { sanitizeComm } from "@/lib/settings";
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
  if (!(await isManager())) return { status: "error", message: "Accès refusé." };
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
  if (!(await isManager())) return { status: "error", message: "Accès refusé." };
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
  if (!(await isManager())) return { status: "error", message: "Accès refusé." };
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

// --- Équipe -------------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isRole = (r: string) => (roles as readonly string[]).includes(r);

// Ajoute un membre : tout de suite s'il a déjà un compte, sinon invitation (il devient membre en confirmant son compte).
export async function addMember(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  if (!(await isManager())) return { status: "error", message: "Réservé aux gérants." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const role = String(formData.get("role") ?? "");
  if (!EMAIL_RE.test(email)) return { status: "error", message: "Adresse email invalide." };
  if (name.length < 2) return { status: "error", message: "Indique un prénom." };
  if (!isRole(role)) return { status: "error", message: "Rôle inconnu." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_team_member", { p_email: email, p_name: name, p_role: role });
  if (error) return { status: "error", message: "Impossible d'ajouter ce membre." };
  revalidatePath("/admin", "layout");
  return {
    status: "success",
    message:
      data === "ajouté"
        ? `${name} a maintenant accès au gestionnaire.`
        : `${name} est invité : il aura accès dès qu'il aura créé et confirmé son compte sur le site avec ${email}.`,
  };
}

export async function setMemberRole(userId: string, role: string): Promise<SettingsState> {
  const me = await getMe();
  if (me?.role !== "gérant") return { status: "error", message: "Réservé aux gérants." };
  if (userId === me.userId) return { status: "error", message: "Tu ne peux pas changer ton propre rôle." };
  if (!isRole(role)) return { status: "error", message: "Rôle inconnu." };
  const supabase = await createClient();
  const { error } = await supabase.from("admins").update({ role }).eq("user_id", userId);
  if (error) return { status: "error", message: "Impossible de changer le rôle." };
  revalidatePath("/admin", "layout");
  return { status: "success", message: "Rôle mis à jour." };
}

export async function removeMember(userId: string): Promise<SettingsState> {
  const me = await getMe();
  if (me?.role !== "gérant") return { status: "error", message: "Réservé aux gérants." };
  if (userId === me.userId) return { status: "error", message: "Tu ne peux pas te retirer toi-même." };
  const supabase = await createClient();
  const { error } = await supabase.from("admins").delete().eq("user_id", userId);
  if (error) return { status: "error", message: "Impossible de retirer ce membre." };
  revalidatePath("/admin", "layout");
  return { status: "success", message: "Accès retiré. Son compte client reste sur le site." };
}

export async function cancelInvite(email: string): Promise<SettingsState> {
  if (!(await isManager())) return { status: "error", message: "Réservé aux gérants." };
  const supabase = await createClient();
  const { error } = await supabase.from("admin_invites").delete().eq("email", email);
  if (error) return { status: "error", message: "Impossible d'annuler l'invitation." };
  revalidatePath("/admin/parametres");
  return { status: "success", message: "Invitation annulée." };
}

// Emails et communication : textes des emails de statut, réponses toutes faites, avis Google, relance.
export async function saveComm(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  if (!(await isManager())) return { status: "error", message: "Accès refusé." };
  let replies: unknown = [];
  try {
    replies = JSON.parse(String(formData.get("replies") ?? "[]"));
  } catch {
    return { status: "error", message: "Réponses toutes faites illisibles." };
  }
  const templates: Record<string, { title: string; message: string }> = {};
  for (const s of ["devis envoyé", "en impression", "terminée", "annulée"]) {
    const title = String(formData.get(`t_${s}_title`) ?? "").trim();
    const message = String(formData.get(`t_${s}_message`) ?? "").trim();
    if (title && message) templates[s] = { title, message };
  }
  const value = sanitizeComm({
    templates,
    replies,
    reviewUrl: String(formData.get("reviewUrl") ?? ""),
    winBack: String(formData.get("winBack") ?? ""),
  });
  if (String(formData.get("reviewUrl") ?? "").trim() && !value.reviewUrl) return { status: "error", message: "Le lien d'avis doit commencer par https://" };
  const supabase = await createClient();
  const { error } = await supabase.from("admin_settings").upsert({ key: "communication", value, updated_at: new Date().toISOString() });
  if (error) return { status: "error", message: "Impossible d'enregistrer." };
  revalidatePath("/admin/parametres");
  revalidatePath("/admin/boite");
  return { status: "success", message: "Enregistré" };
}
