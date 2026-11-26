"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export type PromoState = { status: "idle" | "success" | "error"; message?: string };

export async function savePromo(_prev: PromoState, formData: FormData): Promise<PromoState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const code = get("code").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const kind = get("kind") === "montant" ? "montant" : "pourcent";
  const raw = Number(get("value").replace(",", "."));
  const value = kind === "montant" ? Math.round(raw * 100) : Math.round(raw);
  const min = Math.round(Number(get("min").replace(",", ".") || 0) * 100);
  const maxUses = parseInt(get("max_uses")) || null;
  const expires = get("expires_on");
  if (code.length < 3 || code.length > 30) return { status: "error", message: "Code de 3 à 30 lettres ou chiffres." };
  if (!Number.isFinite(value) || value <= 0 || (kind === "pourcent" && value > 90)) return { status: "error", message: "Réduction invalide (1 à 90 % ou un montant)." };
  if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) return { status: "error", message: "Date invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("promo_codes").insert({
    code,
    kind,
    value,
    min_cents: Number.isFinite(min) ? min : 0,
    max_uses: maxUses,
    expires_on: expires || null,
    note: get("note").slice(0, 200) || null,
  });
  if (error) return { status: "error", message: error.code === "23505" ? "Ce code existe déjà." : "Impossible de créer le code." };
  await logActivity("a créé le code promo", code, "/admin/promos");
  revalidatePath("/admin/promos");
  return { status: "success", message: `Code ${code} créé` };
}

export async function togglePromo(code: string, active: boolean) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  await supabase.from("promo_codes").update({ active }).eq("code", code);
  revalidatePath("/admin/promos");
}

export async function deletePromo(code: string) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  await supabase.from("promo_codes").delete().eq("code", code);
  await logActivity("a supprimé le code promo", code, "/admin/promos");
  revalidatePath("/admin/promos");
}
