// Calculs financiers d'une micro-entreprise (sans dépendance serveur).
import type { AdminOrder } from "@/lib/orders";

export const expenseCategories = ["Filament", "Matériel", "Emballage", "Envoi", "Logiciel", "Publicité", "Autre"] as const;

export type Expense = {
  id: string;
  spent_on: string;
  label: string;
  category: string;
  amount_cents: number;
  supplier: string | null;
  receipt_path: string | null;
  order_id: string | null;
  created_at: string;
};

export type FinanceSettings = {
  urssafPeriod: "mensuelle" | "trimestrielle";
  urssafRatePct: number; // cotisations sociales sur le chiffre d'affaires
  liberatoirePct: number; // versement libératoire de l'impôt (0 si non choisi)
};

export const defaultFinanceSettings: FinanceSettings = { urssafPeriod: "trimestrielle", urssafRatePct: 12.3, liberatoirePct: 0 };

export function sanitizeFinance(raw: unknown): FinanceSettings {
  const r = (raw ?? {}) as Partial<FinanceSettings>;
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 50 ? v : d);
  return {
    urssafPeriod: r.urssafPeriod === "mensuelle" ? "mensuelle" : "trimestrielle",
    urssafRatePct: num(r.urssafRatePct, defaultFinanceSettings.urssafRatePct),
    liberatoirePct: num(r.liberatoirePct, 0),
  };
}

// Plafonds pour la vente de marchandises (fabrication et vente d'objets). Valeurs 2025-2026 :
// à revérifier chaque année sur autoentrepreneur.urssaf.fr et impots.gouv.fr.
export const thresholds = {
  micro: 188_700_00, // au-delà deux années de suite : sortie du régime micro
  vat: 85_000_00, // franchise de TVA : au-delà, TVA à facturer à partir de l'année suivante
  vatMajor: 93_500_00, // au-delà : TVA due immédiatement
};

// Une vente compte à sa date d'encaissement : paiement en ligne, sinon commande terminée.
export function saleDate(o: AdminOrder) {
  if (o.payment === "payée" && o.paid_at) return new Date(o.paid_at);
  if (o.status === "terminée") return new Date(o.updated_at ?? o.created_at);
  return null;
}

export const saleAmount = (o: AdminOrder) => Math.max(0, (o.final_cents ?? o.estimated_cents ?? 0) - (o.refunded_cents ?? 0));

export type Sale = { order: AdminOrder; date: Date; amount: number };

export function sales(orders: AdminOrder[]): Sale[] {
  return orders
    .filter((o) => o.status !== "annulée" || (o.payment === "payée" && saleAmount(o) > 0))
    .map((o) => ({ order: o, date: saleDate(o), amount: saleAmount(o) }))
    .filter((s): s is Sale => s.date !== null && s.amount > 0)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

// Frais Stripe estimés (carte européenne) : 1,5 % + 0,25 €.
export const stripeFee = (o: AdminOrder) => (o.payment === "payée" ? Math.round(saleAmount(o) * 0.015) + 25 : 0);

// ── Périodes URSSAF ──────────────────────────────────────────────────────────

const parisYMD = (d: Date) => {
  const [y, m, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d).split("-").map(Number);
  return { y, m, d: day };
};

export type UrssafPeriod = { label: string; start: Date; end: Date; due: Date };

// Période à déclarer : celle qui vient de se terminer (on déclare le mois ou le trimestre écoulé).
export function urssafPeriods(now: Date, period: FinanceSettings["urssafPeriod"]) {
  const { y, m } = parisYMD(now);
  const monthName = (mm: number, yy: number) => new Date(Date.UTC(yy, mm - 1, 15)).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const lastDay = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 0, 12));
  if (period === "mensuelle") {
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    const previous: UrssafPeriod = { label: monthName(pm, py), start: new Date(Date.UTC(py, pm - 1, 1)), end: new Date(Date.UTC(y, m - 1, 1)), due: lastDay(y, m) };
    const current: UrssafPeriod = { label: monthName(m, y), start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)), due: lastDay(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1) };
    return { previous, current };
  }
  const q = Math.floor((m - 1) / 3); // 0..3
  const qStart = (yy: number, qq: number) => new Date(Date.UTC(yy, qq * 3, 1));
  const dueOf = (yy: number, qq: number) => lastDay(qq === 3 ? yy + 1 : yy, qq === 3 ? 1 : qq * 3 + 4);
  const pq = q === 0 ? 3 : q - 1;
  const py = q === 0 ? y - 1 : y;
  const previous: UrssafPeriod = { label: `${pq + 1}ᵉ trimestre ${py}`, start: qStart(py, pq), end: qStart(y, q), due: dueOf(py, pq) };
  const current: UrssafPeriod = { label: `${q + 1}ᵉ trimestre ${y}`, start: qStart(y, q), end: q === 3 ? qStart(y + 1, 0) : qStart(y, q + 1), due: dueOf(y, q) };
  return { previous, current };
}

export const sumIn = (list: Sale[], start: Date, end: Date) => list.filter((s) => s.date >= start && s.date < end).reduce((n, s) => n + s.amount, 0);

export const monthKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" }).format(d).slice(0, 7);
