import Link from "next/link";
import { AlertTriangle, CalendarClock, Download, Landmark, PiggyBank, Receipt, TrendingUp, Wallet } from "lucide-react";
import PageHeader from "../PageHeader";
import { ExpenseForm, ExpenseList, FinanceSettingsForm } from "./FinanceForms";
import { isManager, requireAdmin } from "@/lib/admin";
import {
  monthKey,
  sales,
  sanitizeFinance,
  stripeFee,
  sumIn,
  thresholds,
  urssafPeriods,
  type Expense,
} from "@/lib/finance";
import { getAllOrders } from "@/lib/orders";
import { getTariffs } from "@/lib/settings";
import { formatPrice, orderRef } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Finances" };

const longDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const monthLabel = (key: string) => new Date(`${key}-15T12:00:00`).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

function Card({ title, icon: Icon, children, action }: { title: string; icon: typeof Wallet; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-panel">
      <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <Icon size={14} className="text-muted" aria-hidden />
        <h2 className="text-[13px] font-medium">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-[12.5px]">
        <span>{label}</span>
        <span className="font-mono text-muted">
          {formatPrice(value)} / {formatPrice(max)}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-fg/10">
        <div className={`h-full rounded-full ${pct > 85 ? "bg-red-400" : pct > 60 ? "bg-amber-400" : "bg-accent"}`} style={{ width: `${Math.max(pct, 0.8)}%` }} />
      </div>
      <p className="mt-1 text-[11.5px] text-muted">{pct.toFixed(pct < 10 ? 1 : 0).replace(".", ",")} % du plafond</p>
    </div>
  );
}

export default async function FinancesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [orders, tariffs, manager, { data: expData }, { data: settingsRow }, { data: jobs }] = await Promise.all([
    getAllOrders(),
    getTariffs(),
    isManager(),
    supabase.from("expenses").select("*").order("spent_on", { ascending: false }).limit(500),
    supabase.from("admin_settings").select("value").eq("key", "finance").maybeSingle(),
    supabase.from("print_jobs").select("order_id, material, grams, quantity, grams_lost, status").not("order_id", "is", null),
  ]);
  const expenses = (expData ?? []) as Expense[];
  const settings = sanitizeFinance(settingsRow?.value);
  const now = new Date();
  const year = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric" }).format(now));
  const all = sales(orders);
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearSales = sumIn(all, yearStart, new Date(Date.UTC(year + 1, 0, 1)));
  const { previous, current } = urssafPeriods(now, settings.urssafPeriod);
  const prevCA = sumIn(all, previous.start, previous.end);
  const curCA = sumIn(all, current.start, current.end);
  const rate = (settings.urssafRatePct + settings.liberatoirePct) / 100;
  const daysToDue = Math.ceil((previous.due.getTime() - now.getTime()) / 86_400_000);

  // Coût matière par commande : filament imprimé (et perdu) × prix au kilo des tarifs.
  const materialCost = new Map<string, number>();
  for (const j of jobs ?? []) {
    if (j.status === "en attente") continue;
    const perKg = tariffs.materials[j.material as keyof typeof tariffs.materials] ?? tariffs.materials.Autre;
    const grams = Number(j.grams) * (j.quantity ?? 1) + Number(j.grams_lost ?? 0);
    materialCost.set(j.order_id, (materialCost.get(j.order_id) ?? 0) + Math.round((grams / 1000) * perKg));
  }
  const expenseByOrder = new Map<string, number>();
  for (const e of expenses) if (e.order_id) expenseByOrder.set(e.order_id, (expenseByOrder.get(e.order_id) ?? 0) + e.amount_cents);

  // 6 derniers mois : encaissé, dépenses, cotisations estimées, reste.
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(year, Number(monthKey(now).slice(5)) - 1 - (5 - i), 15));
    return monthKey(d);
  });
  const rows = months.map((key) => {
    const ca = all.filter((s) => monthKey(s.date) === key).reduce((n, s) => n + s.amount, 0);
    const spent = expenses.filter((e) => e.spent_on.startsWith(key)).reduce((n, e) => n + e.amount_cents, 0);
    const fees = all.filter((s) => monthKey(s.date) === key).reduce((n, s) => n + stripeFee(s.order), 0);
    const social = Math.round(ca * rate);
    return { key, ca, spent, fees, social, net: ca - spent - fees - social };
  });
  const maxBar = Math.max(1, ...rows.map((r) => Math.max(r.ca, r.spent)));

  // Trésorerie : moyenne des 3 derniers mois et commandes en cours à encaisser.
  const last3 = rows.slice(-4, -1);
  const avgNet = Math.round(last3.reduce((n, r) => n + r.net, 0) / Math.max(1, last3.length));
  const toCash = orders
    .filter((o) => !["terminée", "annulée"].includes(o.status) && o.payment !== "payée" && (o.final_cents ?? o.estimated_cents))
    .reduce((n, o) => n + (o.final_cents ?? o.estimated_cents ?? 0), 0);

  // Marge des dernières ventes.
  const margins = all.slice(0, 15).map((s) => {
    const material = materialCost.get(s.order.id) ?? 0;
    const linked = expenseByOrder.get(s.order.id) ?? 0;
    const fee = stripeFee(s.order);
    const social = Math.round(s.amount * rate);
    const margin = s.amount - material - linked - fee - social;
    return { sale: s, material, linked, fee, social, margin, pct: s.amount ? Math.round((margin / s.amount) * 100) : 0 };
  });

  const recentOrders = orders.slice(0, 40).map((o) => ({ id: o.id, label: `${orderRef(o.id)} · ${o.customer_name ?? o.product_name ?? "Commande"}` }));

  // Liens temporaires vers les tickets (privés).
  const paths = expenses.map((e) => e.receipt_path).filter((p): p is string => typeof p === "string");
  const receiptUrls: Record<string, string> = {};
  if (paths.length) {
    const { data: urls } = await supabase.storage.from("tickets").createSignedUrls(paths, 3600);
    urls?.forEach((u) => u.path && u.signedUrl && (receiptUrls[u.path] = u.signedUrl));
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Finances" description={`Micro-entreprise · année ${year}`}>
        <Link href={`/admin/finances/export?annee=${year}&type=recettes`} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[12.5px] text-muted hover:text-fg">
          <Download size={13} aria-hidden /> Livre des recettes
        </Link>
        <Link href={`/admin/finances/export?annee=${year}&type=achats`} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[12.5px] text-muted hover:text-fg">
          <Download size={13} aria-hidden /> Registre des achats
        </Link>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Déclaration URSSAF" icon={Landmark}>
          <div className={`rounded-md border px-3 py-2.5 ${daysToDue <= 10 ? "border-amber-400/40 bg-amber-400/10" : "border-line bg-bg/40"}`}>
            <p className="flex items-center gap-1.5 text-[13px] font-medium">
              {daysToDue <= 10 ? <AlertTriangle size={14} className="text-amber-300" aria-hidden /> : <CalendarClock size={14} className="text-muted" aria-hidden />}
              À déclarer : {previous.label}
            </p>
            <p className="mt-1 text-[13px]">
              Chiffre d&apos;affaires : <span className="font-mono">{formatPrice(prevCA)}</span> · cotisations estimées{" "}
              <span className="font-mono">{formatPrice(Math.round(prevCA * rate))}</span>
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              Avant le {longDate.format(previous.due)}
              {daysToDue >= 0 ? ` (dans ${daysToDue} jour${daysToDue > 1 ? "s" : ""})` : " (date passée)"} sur autoentrepreneur.urssaf.fr. À déclarer même si
              c&apos;est 0 €.
            </p>
          </div>
          <p className="mt-3 text-[12.5px] text-muted">
            En cours : {current.label} · <span className="font-mono text-fg">{formatPrice(curCA)}</span> encaissés pour l&apos;instant.
          </p>
          {manager && <FinanceSettingsForm settings={settings} />}
        </Card>

        <Card title="Plafonds micro-entreprise" icon={TrendingUp}>
          <div className="space-y-4">
            <Meter value={yearSales} max={thresholds.vat} label="Franchise de TVA" />
            <Meter value={yearSales} max={thresholds.micro} label="Régime micro (vente de marchandises)" />
          </div>
          <p className="mt-3 text-[11.5px] text-muted">
            Chiffre d&apos;affaires encaissé en {year} : <span className="font-mono text-fg">{formatPrice(yearSales)}</span>. Plafonds 2025-2026, à revérifier chaque
            année. Au-delà de {formatPrice(thresholds.vatMajor)}, la TVA est due tout de suite.
          </p>
        </Card>
      </div>

      <Card title="6 derniers mois" icon={Wallet}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="pb-2 font-medium">Mois</th>
                <th className="pb-2 font-medium">Encaissé</th>
                <th className="pb-2 text-right font-medium">Dépenses</th>
                <th className="pb-2 text-right font-medium">Frais Stripe</th>
                <th className="pb-2 text-right font-medium">Cotisations</th>
                <th className="pb-2 text-right font-medium">Reste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="py-2 capitalize">{monthLabel(r.key)}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-20 font-mono">{formatPrice(r.ca)}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/[0.06]">
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${(r.ca / maxBar) * 100}%` }} />
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-right font-mono text-muted">{formatPrice(r.spent)}</td>
                  <td className="py-2 text-right font-mono text-muted">{formatPrice(r.fees)}</td>
                  <td className="py-2 text-right font-mono text-muted">{formatPrice(r.social)}</td>
                  <td className={`py-2 text-right font-mono ${r.net < 0 ? "text-red-300" : ""}`}>{formatPrice(r.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card title="Marge réelle des dernières ventes" icon={PiggyBank}>
          {margins.length === 0 ? (
            <p className="text-[13px] text-muted">Pas encore de vente encaissée.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-[12.5px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                    <th className="pb-2 font-medium">Commande</th>
                    <th className="pb-2 text-right font-medium">Vendu</th>
                    <th className="pb-2 text-right font-medium">Filament</th>
                    <th className="pb-2 text-right font-medium">Achats liés</th>
                    <th className="pb-2 text-right font-medium">Frais + cotis.</th>
                    <th className="pb-2 text-right font-medium">Marge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {margins.map((m) => (
                    <tr key={m.sale.order.id}>
                      <td className="py-2">
                        <Link href={`/admin/commandes/${m.sale.order.id}`} className="hover:text-accent">
                          <span className="font-mono">{orderRef(m.sale.order.id)}</span> <span className="text-muted">{m.sale.order.customer_name}</span>
                        </Link>
                      </td>
                      <td className="py-2 text-right font-mono">{formatPrice(m.sale.amount)}</td>
                      <td className="py-2 text-right font-mono text-muted">{m.material ? formatPrice(m.material) : "—"}</td>
                      <td className="py-2 text-right font-mono text-muted">{m.linked ? formatPrice(m.linked) : "—"}</td>
                      <td className="py-2 text-right font-mono text-muted">{formatPrice(m.fee + m.social)}</td>
                      <td className={`py-2 text-right font-mono ${m.margin < 0 ? "text-red-300" : "text-accent"}`}>
                        {formatPrice(m.margin)} <span className="text-[11px] text-muted">{m.pct} %</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11.5px] text-muted">
                Filament : grammes des impressions liées à la commande × prix au kilo des Tarifs. Achats liés : dépenses rattachées à la commande (envoi,
                pièce achetée…).
              </p>
            </div>
          )}
        </Card>

        <Card title="Trésorerie prévue" icon={TrendingUp}>
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-muted">Reste moyen par mois (3 derniers)</dt>
              <dd className={`font-mono ${avgNet < 0 ? "text-red-300" : ""}`}>{formatPrice(avgNet)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Commandes en cours à encaisser</dt>
              <dd className="font-mono">{formatPrice(toCash)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 font-medium">
              <dt>Prévu sur 3 mois</dt>
              <dd className="font-mono">{formatPrice(avgNet * 3 + Math.round(toCash * (1 - rate)))}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[11.5px] text-muted">Estimation simple : la moyenne récente continue, et les commandes en cours sont payées.</p>
        </Card>
      </div>

      <Card title="Dépenses" icon={Receipt}>
        <ExpenseForm orders={recentOrders} />
        <ExpenseList expenses={expenses.slice(0, 60)} receiptUrls={receiptUrls} />
      </Card>
    </div>
  );
}
