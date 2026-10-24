"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { filamentMaterials } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export type StockState = { status: "idle" | "success" | "error"; message?: string };

const int = (v: FormDataEntryValue | null, min: number, max: number) => {
  const n = Math.round(Number(String(v ?? "").replace(",", ".")));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

function refresh() {
  revalidatePath("/admin", "layout");
}

export async function addSpool(_prev: StockState, formData: FormData): Promise<StockState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const material = String(formData.get("material") ?? "");
  const color = String(formData.get("color") ?? "").trim().slice(0, 40);
  const colorHex = String(formData.get("color_hex") ?? "#888888");
  const spool = int(formData.get("spool_grams"), 1, 10000);
  const left = int(formData.get("grams_left") || formData.get("spool_grams"), 0, 10000);
  const alert = int(formData.get("alert_grams"), 0, 10000);

  if (!(filamentMaterials as readonly string[]).includes(material)) return { status: "error", message: "Choisissez un matériau." };
  if (!color) return { status: "error", message: "Indiquez la couleur (ex. Noir)." };
  if (!/^#[0-9a-fA-F]{6}$/.test(colorHex)) return { status: "error", message: "Couleur invalide." };
  if (spool === null || left === null || alert === null) return { status: "error", message: "Vérifiez les poids (en grammes)." };

  const supabase = await createClient();
  const { error } = await supabase.from("filament_stock").insert({
    material,
    color,
    color_hex: colorHex,
    spool_grams: spool,
    grams_left: Math.min(left, spool),
    alert_grams: alert,
  });
  if (error) {
    console.error("Stock : ajout impossible", error.message);
    return { status: "error", message: "Impossible d'ajouter la bobine." };
  }
  refresh();
  return { status: "success", message: `Bobine ${material} ${color} ajoutée.` };
}

// Retire (ou ajoute, si négatif) des grammes à une bobine.
export async function consumeFilament(id: string, formData: FormData) {
  if (!(await isAdmin())) return;
  const used = int(formData.get("used"), -10000, 10000);
  if (!used) return;
  const supabase = await createClient();
  const { data } = await supabase.from("filament_stock").select("grams_left, spool_grams").eq("id", id).single();
  if (!data) return;
  const next = Math.max(0, Math.min(data.spool_grams, data.grams_left - used));
  await supabase.from("filament_stock").update({ grams_left: next, updated_at: new Date().toISOString() }).eq("id", id);
  refresh();
}

// Bobine neuve : on remet le poids au maximum.
export async function refillSpool(id: string) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  const { data } = await supabase.from("filament_stock").select("spool_grams").eq("id", id).single();
  if (!data) return;
  await supabase.from("filament_stock").update({ grams_left: data.spool_grams, updated_at: new Date().toISOString() }).eq("id", id);
  refresh();
}

export async function deleteSpool(id: string) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  await supabase.from("filament_stock").delete().eq("id", id);
  refresh();
}
