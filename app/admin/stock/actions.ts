"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { quoteMaterials, sanitizeTariffs } from "@/lib/pricing";
import { getTariffs } from "@/lib/settings";
import { averagePricePerKg, consumableCategories, type Spool } from "@/lib/stock";
import { moveFilament } from "@/lib/stock-server";
import { createClient } from "@/lib/supabase/server";

export type StockState = { status: "idle" | "success" | "error"; message?: string };

const ok = (message?: string): StockState => ({ status: "success", message });
const fail = (message: string): StockState => ({ status: "error", message });
const refresh = () => {
  revalidatePath("/admin/stock");
  revalidatePath("/admin/atelier");
};
const num = (v: FormDataEntryValue | null, min: number, max: number) => {
  const s = String(v ?? "").replace(/\s|€/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};

/* ───────── Bobines ───────── */

export async function addSpool(_prev: StockState, formData: FormData): Promise<StockState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const material = String(formData.get("material") ?? "");
  const color = String(formData.get("color") ?? "").trim().slice(0, 40);
  const colorHex = String(formData.get("color_hex") ?? "#888888");
  const brand = String(formData.get("brand") ?? "").trim().slice(0, 40) || null;
  const spool = num(formData.get("spool_grams"), 1, 10000);
  const alert = num(formData.get("alert_grams"), 0, 10000);
  const price = num(formData.get("price"), 0, 1000);
  const count = num(formData.get("count") || "1", 1, 50);

  if (!(quoteMaterials as readonly string[]).includes(material)) return fail("Choisissez un matériau.");
  if (!color) return fail("Indiquez la couleur (ex. Noir mat).");
  if (!/^#[0-9a-fA-F]{6}$/.test(colorHex)) return fail("Teinte invalide.");
  if (!spool || alert === undefined || alert === null) return fail("Vérifiez les poids (en grammes).");
  if (price === undefined) return fail("Prix invalide. Exemple : 19,99");
  if (!count) return fail("Nombre de bobines invalide.");

  const supabase = await createClient();
  const rows = Array.from({ length: Math.round(count) }, () => ({
    material,
    color,
    color_hex: colorHex,
    brand,
    spool_grams: Math.round(spool),
    grams_left: Math.round(spool),
    alert_grams: Math.round(alert),
    price_cents: price === null ? null : Math.round(price * 100),
  }));
  const { error } = await supabase.from("filament_stock").insert(rows);
  if (error) {
    console.error("Stock :", error.message);
    return fail("Impossible d'ajouter la bobine.");
  }
  refresh();
  return ok(count > 1 ? `${count} bobines ajoutées` : "Bobine ajoutée");
}

// Retirer ou ajouter des grammes à la main (pesée, impression hors gestionnaire…).
export async function adjustSpool(id: string, grams: number): Promise<StockState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  if (!Number.isFinite(grams) || grams === 0 || Math.abs(grams) > 10000) return fail("Quantité invalide.");
  const supabase = await createClient();
  await moveFilament(supabase, id, grams, "ajustement");
  refresh();
  return ok(grams < 0 ? `${-grams} g retirés` : `${grams} g ajoutés`);
}

// Fixe le poids restant après une pesée : l'écart est enregistré comme ajustement.
export async function weighSpool(id: string, gramsLeft: number): Promise<StockState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  if (!Number.isFinite(gramsLeft) || gramsLeft < 0 || gramsLeft > 10000) return fail("Poids invalide.");
  const supabase = await createClient();
  const { data } = await supabase.from("filament_stock").select("grams_left").eq("id", id).maybeSingle();
  if (!data) return fail("Bobine introuvable.");
  await moveFilament(supabase, id, Math.round(gramsLeft) - Number(data.grams_left), "ajustement");
  refresh();
  return ok("Poids mis à jour");
}

// Bobine finie remplacée par une neuve identique.
export async function refillSpool(id: string): Promise<StockState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  const { data } = await supabase.from("filament_stock").select("grams_left, spool_grams").eq("id", id).maybeSingle();
  if (!data) return fail("Bobine introuvable.");
  await moveFilament(supabase, id, Number(data.spool_grams) - Number(data.grams_left), "recharge");
  refresh();
  return ok("Bobine neuve enregistrée");
}

export async function deleteSpool(id: string): Promise<StockState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  const { error } = await supabase.from("filament_stock").delete().eq("id", id);
  if (error) return fail("Impossible de supprimer la bobine.");
  refresh();
  return ok("Bobine supprimée");
}

// Remplace les prix du filament des Tarifs par le prix moyen réellement payé.
export async function applyRealPrices(): Promise<StockState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  const { data } = await supabase.from("filament_stock").select("*");
  const avg = averagePricePerKg((data ?? []) as Spool[]);
  if (avg.size === 0) return fail("Indiquez d'abord le prix d'achat de vos bobines.");
  const t = await getTariffs();
  const next = sanitizeTariffs({ ...t, materials: { ...t.materials, ...Object.fromEntries(avg) } });
  const { error } = await supabase.from("admin_settings").upsert({ key: "tariffs", value: next, updated_at: new Date().toISOString() });
  if (error) return fail("Impossible de mettre à jour les tarifs.");
  revalidatePath("/admin", "layout");
  return ok(`Tarifs mis à jour (${[...avg.keys()].join(", ")})`);
}

/* ───────── Consommables ───────── */

export async function addConsumable(_prev: StockState, formData: FormData): Promise<StockState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const category = String(formData.get("category") ?? "Atelier");
  const unit = String(formData.get("unit") ?? "").trim().slice(0, 20) || "pièce";
  const quantity = num(formData.get("quantity") || "0", 0, 1_000_000);
  const alert = num(formData.get("alert") || "0", 0, 1_000_000);
  const price = num(formData.get("price"), 0, 100000);
  if (!name) return fail("Indiquez le consommable (ex. Buse 0,4 mm).");
  if (!(consumableCategories as readonly string[]).includes(category)) return fail("Catégorie inconnue.");
  if (quantity == null || alert == null || price === undefined) return fail("Vérifiez les quantités et le prix.");

  const supabase = await createClient();
  const { error } = await supabase.from("consumables").insert({
    name,
    category,
    unit,
    quantity,
    alert_quantity: alert,
    price_cents: price === null ? null : Math.round(price * 100),
  });
  if (error) {
    console.error("Consommables :", error.message);
    return fail("Impossible d'ajouter le consommable.");
  }
  refresh();
  return ok("Consommable ajouté");
}

export async function adjustConsumable(id: string, delta: number): Promise<StockState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  const { data } = await supabase.from("consumables").select("quantity").eq("id", id).maybeSingle();
  if (!data) return fail("Consommable introuvable.");
  const { error } = await supabase
    .from("consumables")
    .update({ quantity: Math.max(0, Number(data.quantity) + delta) })
    .eq("id", id);
  if (error) return fail("Impossible de modifier la quantité.");
  refresh();
  return ok();
}

export async function deleteConsumable(id: string): Promise<StockState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  const { error } = await supabase.from("consumables").delete().eq("id", id);
  if (error) return fail("Impossible de supprimer.");
  refresh();
  return ok("Consommable supprimé");
}
