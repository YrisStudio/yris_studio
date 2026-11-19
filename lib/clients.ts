// Clients : types et regroupement des commandes par client. Sans dépendance serveur.
import type { AdminOrder } from "@/lib/orders";

export type ClientRecord = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  tags: string[];
  is_pro: boolean;
  pro_discount_pct: number;
  created_at: string;
  updated_at: string;
};

export type ClientNote = {
  id: string;
  client_email: string;
  body: string;
  author_email: string | null;
  created_at: string;
};

export type Account = { email: string; created_at: string; last_sign_in_at: string | null };

export type ClientSummary = {
  email: string;
  name: string;
  company: string | null;
  phone: string | null;
  city: string | null;
  tags: string[];
  isPro: boolean;
  proDiscountPct: number;
  hasAccount: boolean;
  accountSince: string | null;
  orders: number;
  open: number;
  spentCents: number;
  firstOrder: string | null;
  lastOrder: string | null;
};

export const suggestedTags = ["Fidèle", "VIP", "Garage", "Magasin", "À relancer", "Pressé", "Particulier"] as const;

export const clientKey = (email: string) => encodeURIComponent(email.toLowerCase());

const DAY = 86_400_000;
export const isInactive = (c: ClientSummary, now = new Date(), days = 90) =>
  c.lastOrder !== null && now.getTime() - new Date(c.lastOrder).getTime() > days * DAY;

// Regroupe commandes, fiches enregistrées et comptes par email.
export function buildClients(orders: AdminOrder[], records: ClientRecord[], accounts: Account[]): ClientSummary[] {
  const map = new Map<string, ClientSummary>();
  const get = (email: string) => {
    let c = map.get(email);
    if (!c) {
      c = {
        email,
        name: email.split("@")[0],
        company: null,
        phone: null,
        city: null,
        tags: [],
        isPro: false,
        proDiscountPct: 0,
        hasAccount: false,
        accountSince: null,
        orders: 0,
        open: 0,
        spentCents: 0,
        firstOrder: null,
        lastOrder: null,
      };
      map.set(email, c);
    }
    return c;
  };

  // Les commandes les plus anciennes d'abord : les infos les plus récentes écrasent les anciennes.
  for (const o of [...orders].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const email = o.customer_email?.trim().toLowerCase();
    if (!email) continue;
    const c = get(email);
    c.orders += 1;
    if (o.status !== "terminée" && o.status !== "annulée") c.open += 1;
    if (o.status === "terminée") c.spentCents += o.final_cents ?? o.estimated_cents ?? 0;
    if (o.customer_name) c.name = o.customer_name;
    c.company = o.customer_company ?? c.company;
    c.phone = o.phone ?? c.phone;
    c.city = o.city ?? c.city;
    c.firstOrder ??= o.created_at;
    c.lastOrder = o.created_at;
  }
  for (const a of accounts) {
    const c = get(a.email);
    c.hasAccount = true;
    c.accountSince = a.created_at;
  }
  // La fiche enregistrée à la main a le dernier mot.
  for (const r of records) {
    const c = get(r.email);
    if (r.name) c.name = r.name;
    if (r.company) c.company = r.company;
    if (r.phone) c.phone = r.phone;
    c.tags = r.tags ?? [];
    c.isPro = r.is_pro;
    c.proDiscountPct = Number(r.pro_discount_pct ?? 0);
  }
  return [...map.values()];
}
