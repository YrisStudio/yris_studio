// Stock : types et calculs sans dépendance serveur (utilisés aussi dans le navigateur).

export type Spool = {
  id: string;
  material: string;
  color: string;
  color_hex: string;
  brand: string | null;
  grams_left: number;
  spool_grams: number;
  alert_grams: number;
  price_cents: number | null;
  created_at: string;
  updated_at: string;
};

export type StockMovement = {
  id: string;
  spool_id: string;
  grams: number; // négatif = consommé
  reason: "impression" | "raté" | "recharge" | "ajustement";
  job_id: string | null;
  created_at: string;
};

export type Consumable = {
  id: string;
  name: string;
  category: "Atelier" | "Emballage" | "Pièces imprimante" | "Autre";
  quantity: number;
  unit: string;
  alert_quantity: number;
  price_cents: number | null;
  created_at: string;
};

export const consumableCategories = ["Atelier", "Emballage", "Pièces imprimante", "Autre"] as const;

export const isLow = (s: Pick<Spool, "grams_left" | "alert_grams">) => Number(s.grams_left) <= Number(s.alert_grams);

// Prix réel d'une bobine au kilo (en centimes), si son prix d'achat est connu.
export const pricePerKg = (s: Pick<Spool, "price_cents" | "spool_grams">) =>
  s.price_cents != null && s.spool_grams > 0 ? Math.round((s.price_cents / s.spool_grams) * 1000) : null;

// Prix moyen au kilo par matériau (moyenne pondérée par le poids des bobines dont le prix est connu).
export function averagePricePerKg(spools: Spool[]) {
  const acc = new Map<string, { cents: number; grams: number }>();
  for (const s of spools) {
    if (s.price_cents == null || s.spool_grams <= 0) continue;
    const a = acc.get(s.material) ?? { cents: 0, grams: 0 };
    a.cents += s.price_cents;
    a.grams += s.spool_grams;
    acc.set(s.material, a);
  }
  return new Map([...acc].map(([m, a]) => [m, Math.round((a.cents / a.grams) * 1000)]));
}

// Consommation moyenne par jour et par matériau, sur les 30 derniers jours (sorties seulement).
export function dailyUse(movements: StockMovement[], spools: Spool[], now = new Date()) {
  const since = now.getTime() - 30 * 86_400_000;
  const material = new Map(spools.map((s) => [s.id, s.material]));
  const used = new Map<string, number>();
  for (const m of movements) {
    if (m.grams >= 0 || m.reason === "ajustement" || new Date(m.created_at).getTime() < since) continue;
    const mat = material.get(m.spool_id);
    if (mat) used.set(mat, (used.get(mat) ?? 0) - Number(m.grams));
  }
  return new Map([...used].map(([k, g]) => [k, g / 30]));
}
