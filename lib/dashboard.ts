// Tableau de bord : calculs à partir des commandes (sans dépendance serveur).
import { orderAmount, type AdminOrder } from "@/lib/orders";

const TZ = "Europe/Paris";
const DAY = 86_400_000;

// Date de fin d'une commande terminée (dernière mise à jour), sinon sa création.
const doneAt = (o: AdminOrder) => new Date(o.updated_at ?? o.created_at);

// Commandes terminées qui comptent dans les chiffres (après la remise à zéro éventuelle).
export function paidOrders(orders: AdminOrder[], resetAt: Date | null) {
  return orders.filter((o) => o.status === "terminée" && (!resetAt || doneAt(o) >= resetAt));
}

// Début du jour, de la semaine (lundi) et du mois, à l'heure de Paris.
function parisParts(d: Date) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)!.value;
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")), wd: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) };
}
// Minuit à Paris pour une date du calendrier (gère l'heure d'été).
function parisMidnight(y: number, m: number, d: number) {
  const guess = Date.UTC(y, m - 1, d);
  const offset = new Date(guess).toLocaleString("en-US", { timeZone: TZ, timeZoneName: "shortOffset" }).match(/GMT([+-]\d+)/);
  return new Date(guess - (offset ? Number(offset[1]) : 1) * 3_600_000);
}

export type Period = "jour" | "semaine" | "mois" | "année";

// La période en cours et la même durée sur la période précédente (comparaison à date égale).
export function periodRange(period: Period, now: Date) {
  const { y, m, d, wd } = parisParts(now);
  let start: Date;
  let prevStart: Date;
  if (period === "jour") {
    start = parisMidnight(y, m, d);
    prevStart = new Date(start.getTime() - DAY);
  } else if (period === "semaine") {
    start = new Date(parisMidnight(y, m, d).getTime() - wd * DAY);
    prevStart = new Date(start.getTime() - 7 * DAY);
  } else if (period === "mois") {
    start = parisMidnight(y, m, 1);
    prevStart = parisMidnight(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1, 1);
  } else {
    start = parisMidnight(y, 1, 1);
    prevStart = parisMidnight(y - 1, 1, 1);
  }
  const elapsed = now.getTime() - start.getTime();
  return { start, end: now, prevStart, prevEnd: new Date(prevStart.getTime() + elapsed) };
}

export function periodStats(orders: AdminOrder[], paid: AdminOrder[], from: Date, to: Date) {
  const inRange = (t: Date) => t >= from && t < to;
  const done = paid.filter((o) => inRange(doneAt(o)));
  const revenue = done.reduce((n, o) => n + orderAmount(o), 0);
  return {
    revenue,
    doneCount: done.length,
    average: done.length ? Math.round(revenue / done.length) : 0,
    newOrders: orders.filter((o) => inRange(new Date(o.created_at))).length,
  };
}

// Variation en % (null si pas de base de comparaison).
export const change = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);

// Chiffre d'affaires des 12 derniers mois, avec le même mois l'année d'avant.
export function monthlyRevenue(paid: AdminOrder[], now: Date) {
  const { y, m } = parisParts(now);
  const key = (d: Date) => {
    const p = parisParts(d);
    return p.y * 12 + (p.m - 1);
  };
  const totals = new Map<number, number>();
  for (const o of paid) totals.set(key(doneAt(o)), (totals.get(key(doneAt(o))) ?? 0) + orderAmount(o));
  const current = y * 12 + (m - 1);
  const label = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, i) => {
    const k = current - 11 + i;
    return {
      label: label.format(new Date(Date.UTC(Math.floor(k / 12), k % 12, 15))).replace(".", ""),
      year: Math.floor(k / 12),
      value: totals.get(k) ?? 0,
      previous: totals.get(k - 12) ?? 0,
    };
  });
}

// Projection de fin de mois au rythme actuel.
export function monthProjection(monthRevenue: number, now: Date) {
  const { y, m, d } = parisParts(now);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { projected: d > 0 ? Math.round((monthRevenue / d) * days) : 0, daysLeft: days - d, days };
}

// Demandes reçues par jour de la semaine et tranche de 4 h (heure de Paris), pour voir les moments forts.
export function activityGrid(orders: AdminOrder[]) {
  const grid = Array.from({ length: 7 }, () => Array<number>(6).fill(0));
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", hour: "2-digit", hour12: false });
  for (const o of orders) {
    const parts = fmt.formatToParts(new Date(o.created_at));
    const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.find((p) => p.type === "weekday")!.value);
    const h = Number(parts.find((p) => p.type === "hour")!.value) % 24;
    if (wd >= 0) grid[wd][Math.floor(h / 4)] += 1;
  }
  return grid;
}
