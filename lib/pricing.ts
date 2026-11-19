// Calcul des devis. Fichier sans dépendance serveur : utilisé par le générateur (navigateur)
// et recalculé côté serveur à l'enregistrement, pour ne jamais faire confiance au navigateur.

export const quoteMaterials = ["PLA", "PETG", "ABS", "ASA", "TPU", "Autre"] as const;
export type QuoteMaterial = (typeof quoteMaterials)[number];

// Tarifs de l'atelier (Paramètres → Tarifs). Tous les montants sont en centimes.
export type Tariffs = {
  materials: Record<QuoteMaterial, number>; // prix d'achat du filament, par kilo
  machineHourCents: number; // usure de l'imprimante + électricité, par heure d'impression
  laborHourCents: number; // préparation, finition, emballage, par heure
  marginPct: number; // marge ajoutée sur le coût de revient
  wastePct: number; // filament perdu (purge, supports, ratés)
  minimumCents: number; // prix minimum d'une commande (hors livraison)
  shippingCents: number; // livraison forfaitaire
};

export const defaultTariffs: Tariffs = {
  materials: { PLA: 2500, PETG: 2800, ABS: 3000, ASA: 3500, TPU: 4000, Autre: 3000 },
  machineHourCents: 150,
  laborHourCents: 2500,
  marginPct: 40,
  wastePct: 5,
  minimumCents: 1000,
  shippingCents: 690,
};

// Ce que l'on saisit dans le générateur, pour une pièce.
export type QuoteInputs = {
  label: string; // ex. « Clip de garniture »
  material: QuoteMaterial;
  grams: number; // filament par pièce (donné par Bambu Studio)
  hours: number; // temps d'impression par pièce
  quantity: number;
  finishingMinutes: number; // préparation + finition + emballage, pour toute la commande
  delivery: boolean;
  discountPct: number;
};

export type QuoteLine = { label: string; qty: number; unit_cents: number };

export type QuoteResult = {
  materialCents: number;
  machineCents: number;
  laborCents: number;
  costCents: number; // coût de revient total
  marginCents: number;
  unitCents: number; // prix d'une pièce
  piecesCents: number; // prix des pièces, minimum appliqué
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  minimumApplied: boolean;
  lines: QuoteLine[];
};

const clamp = (n: number, min: number, max: number) => (Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);

// Nettoie des valeurs venues d'un formulaire (ou de la base) pour qu'elles restent raisonnables.
export function sanitizeInputs(raw: Partial<QuoteInputs>): QuoteInputs {
  const material = quoteMaterials.includes(raw.material as QuoteMaterial) ? (raw.material as QuoteMaterial) : "PLA";
  return {
    label: String(raw.label ?? "").trim().slice(0, 120) || "Pièce imprimée en 3D",
    material,
    grams: clamp(Number(raw.grams), 0, 20000),
    hours: clamp(Number(raw.hours), 0, 500),
    quantity: Math.round(clamp(Number(raw.quantity), 1, 1000)),
    finishingMinutes: clamp(Number(raw.finishingMinutes), 0, 6000),
    delivery: Boolean(raw.delivery),
    discountPct: clamp(Number(raw.discountPct), 0, 100),
  };
}

export function sanitizeTariffs(raw: unknown): Tariffs {
  const r = (raw ?? {}) as Partial<Tariffs>;
  const m = (r.materials ?? {}) as Partial<Record<QuoteMaterial, number>>;
  const cents = (v: unknown, d: number) => Math.round(clamp(Number(v ?? d), 0, 10_000_00));
  return {
    materials: Object.fromEntries(quoteMaterials.map((k) => [k, cents(m[k], defaultTariffs.materials[k])])) as Tariffs["materials"],
    machineHourCents: cents(r.machineHourCents, defaultTariffs.machineHourCents),
    laborHourCents: cents(r.laborHourCents, defaultTariffs.laborHourCents),
    marginPct: clamp(Number(r.marginPct ?? defaultTariffs.marginPct), 0, 500),
    wastePct: clamp(Number(r.wastePct ?? defaultTariffs.wastePct), 0, 100),
    minimumCents: cents(r.minimumCents, defaultTariffs.minimumCents),
    shippingCents: cents(r.shippingCents, defaultTariffs.shippingCents),
  };
}

// Prix « propres » : arrondi aux 10 centimes supérieurs (12,43 € → 12,50 €).
const roundUp10 = (cents: number) => Math.ceil(cents / 10) * 10;

export function computeQuote(inputs: QuoteInputs, t: Tariffs): QuoteResult {
  const q = inputs.quantity;
  const materialCents = Math.round(((inputs.grams * q * (1 + t.wastePct / 100)) / 1000) * t.materials[inputs.material]);
  const machineCents = Math.round(inputs.hours * q * t.machineHourCents);
  const laborCents = Math.round((inputs.finishingMinutes / 60) * t.laborHourCents);
  const costCents = materialCents + machineCents + laborCents;
  const marginCents = Math.round((costCents * t.marginPct) / 100);

  const rawUnit = (costCents + marginCents) / q;
  let unitCents = roundUp10(rawUnit);
  let piecesCents = unitCents * q;
  const minimumApplied = piecesCents < t.minimumCents;
  if (minimumApplied) {
    unitCents = roundUp10(t.minimumCents / q);
    piecesCents = unitCents * q;
  }

  const discountCents = Math.round((piecesCents * inputs.discountPct) / 100);
  const shippingCents = inputs.delivery ? t.shippingCents : 0;
  const totalCents = piecesCents - discountCents + shippingCents;

  const detail = [inputs.material, inputs.grams ? `${Math.round(inputs.grams)} g` : null].filter(Boolean).join(" · ");
  const lines: QuoteLine[] = [{ label: `${inputs.label} (${detail})`, qty: q, unit_cents: unitCents }];
  if (discountCents > 0) lines.push({ label: `Remise ${inputs.discountPct} %`, qty: 1, unit_cents: -discountCents });
  if (shippingCents > 0) lines.push({ label: "Livraison", qty: 1, unit_cents: shippingCents });

  return {
    materialCents,
    machineCents,
    laborCents,
    costCents,
    marginCents,
    unitCents,
    piecesCents,
    discountCents,
    shippingCents,
    totalCents,
    minimumApplied,
    lines,
  };
}
