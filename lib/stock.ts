import { createClient } from "@/lib/supabase/server";

export type Spool = {
  id: string;
  material: string;
  color: string;
  color_hex: string;
  grams_left: number;
  spool_grams: number;
  alert_grams: number;
  updated_at: string;
};

// Bobines de filament, les plus basses en premier. Réservé à l'admin (règle d'accès de la base).
export async function getStock() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("filament_stock").select("*").order("material").order("color");
  if (error) console.error("Stock :", error.message);
  return (data ?? []) as Spool[];
}

export const isLow = (s: Spool) => s.grams_left <= s.alert_grams;
