import type { Consumable, Spool, StockMovement } from "@/lib/stock";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Bobines de filament. Réservé à l'admin (règle d'accès de la base).
export async function getStock() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("filament_stock").select("*").order("material").order("color");
  if (error) console.error("Stock :", error.message);
  return (data ?? []) as Spool[];
}

export async function getMovements(limit = 300) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) console.error("Mouvements de stock :", error.message);
  return (data ?? []) as StockMovement[];
}

export async function getConsumables() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("consumables").select("*").order("category").order("name");
  if (error) console.error("Consommables :", error.message);
  return (data ?? []) as Consumable[];
}

// Retire (ou ajoute) du filament sur une bobine et garde la trace du mouvement.
export async function moveFilament(
  supabase: Supabase,
  spoolId: string,
  grams: number,
  reason: StockMovement["reason"],
  jobId: string | null = null,
) {
  if (!grams) return;
  const { data } = await supabase.from("filament_stock").select("grams_left, spool_grams").eq("id", spoolId).maybeSingle();
  if (!data) return;
  const next = Math.max(0, Math.round(Number(data.grams_left) + grams));
  await supabase.from("filament_stock").update({ grams_left: next, updated_at: new Date().toISOString() }).eq("id", spoolId);
  await supabase.from("stock_movements").insert({ spool_id: spoolId, grams, reason, job_id: jobId });
}

// Bobine à utiliser pour une impression : celle choisie, sinon la plus entamée du bon matériau
// qui a encore assez de filament (pour finir les bobines entamées d'abord).
export async function pickSpool(supabase: Supabase, material: string | null, needed: number, chosen: string | null) {
  if (chosen) return chosen;
  if (!material) return null;
  const { data } = await supabase
    .from("filament_stock")
    .select("id, grams_left")
    .eq("material", material)
    .gte("grams_left", Math.max(1, Math.round(needed)))
    .order("grams_left")
    .limit(1);
  return data?.[0]?.id ?? null;
}
