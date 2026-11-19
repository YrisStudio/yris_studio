import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckSquare,
  Cylinder,
  FileText,
  Inbox,
  LifeBuoy,
  Printer,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import ActivityGrid from "./_dashboard/ActivityGrid";
import GoalCard from "./_dashboard/GoalCard";
import KeyFigures from "./_dashboard/KeyFigures";
import RevenueChart from "./_dashboard/RevenueChart";
import { getStatsResetAt, requireAdmin } from "@/lib/admin";
import { formatHours, hoursUntilMaintenance, planPrinter } from "@/lib/atelier";
import { getPrintJobs, getPrinters } from "@/lib/atelier-server";
import { activityGrid, change, monthlyRevenue, monthProjection, paidOrders, periodRange, periodStats, type Period } from "@/lib/dashboard";
import { getAllOrders, isLate, type OrderEvent } from "@/lib/orders";
import { eventLabel } from "@/lib/orders-meta";
import { isLow } from "@/lib/stock";
import { getConsumables, getStock } from "@/lib/stock-server";
import { orderRef } from "@/lib/site";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata = { title: "Tableau de bord" };

const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

function ago(iso: string, now: Date) {
  const s = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  if (Math.abs(s) < 60) return "à l'instant";
  if (Math.abs(s) < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (Math.abs(s) < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

type Todo = { href: string; icon: LucideIcon; label: string; value: number; note?: string; tone: "alert" | "warn" | "calm" };

export default async function AdminHome() {
  await requireAdmin();
  const supabase = await createClient();
  const now = new Date();
  const [user, orders, resetAt, printers, jobs, spools, consumables, reportsRes, todosRes, goalRes, eventsRes] = await Promise.all([
    getUser(),
    getAllOrders(),
    getStatsResetAt(),
    getPrinters(),
    getPrintJobs(),
    getStock(),
    getConsumables(),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "nouveau"),
    supabase.from("admin_todos").select("id", { count: "exact", head: true }).eq("done", false).eq("priority", 1),
    supabase.from("admin_settings").select("value").eq("key", "monthly_goal_cents").maybeSingle(),
    supabase.from("order_events").select("*").order("created_at", { ascending: false }).limit(8),
  ]);

  // Chiffres par période, comparés à la même durée sur la période précédente.
  const paid = paidOrders(orders, resetAt);
  const periods = (["jour", "semaine", "mois", "année"] as Period[]).map((p) => {
    const r = periodRange(p, now);
    const cur = periodStats(orders, paid, r.start, r.end);
    const prev = periodStats(orders, paid, r.prevStart, r.prevEnd);
    return {
      period: p,
      cur,
      prev,
      revenueChange: change(cur.revenue, prev.revenue),
      ordersChange: change(cur.newOrders, prev.newOrders),
      averageChange: change(cur.average, prev.average),
    };
  });
  const month = periods.find((p) => p.period === "mois")!;
  const goal = typeof goalRes.data?.value === "number" ? goalRes.data.value : 0;
  const projection = monthProjection(month.cur.revenue, now);
  const pipeline = orders.filter((o) => o.status !== "terminée" && o.status !== "annulée").reduce((n, o) => n + (o.final_cents ?? o.estimated_cents ?? 0), 0);

  // À faire aujourd'hui.
  const running = jobs.active.filter((j) => j.status === "en cours");
  const queuedHours = jobs.active.filter((j) => j.status === "à faire").reduce((n, j) => n + Number(j.hours) * j.quantity, 0);
  const nextEnd = running
    .map((j) => planPrinter(jobs.active.filter((x) => x.printer_id === j.printer_id), now).get(j.id)?.end)
    .filter(Boolean)
    .sort((a, b) => a!.getTime() - b!.getTime())[0];
  const lowStock = spools.filter(isLow).length + consumables.filter((c) => Number(c.quantity) <= Number(c.alert_quantity)).length;
  const maintenance = printers.filter((p) => hoursUntilMaintenance(p) <= 0).length;
  const late = orders.filter((o) => isLate(o)).length;

  const todo: Todo[] = [
    { href: "/admin/commandes", icon: Inbox, label: "Nouvelles demandes", value: orders.filter((o) => o.status === "reçue").length, note: "à chiffrer", tone: "alert" },
    { href: "/admin/commandes", icon: FileText, label: "Devis en attente", value: orders.filter((o) => o.status === "devis envoyé").length, note: "réponse du client", tone: "calm" },
    { href: "/admin/commandes", icon: CalendarClock, label: "En retard", value: late, note: "date promise dépassée", tone: "alert" },
    {
      href: "/admin/atelier",
      icon: Printer,
      label: "Impressions",
      value: running.length,
      note: running.length ? `en cours · fin ~ ${timeFmt.format(nextEnd ?? now)}` : queuedHours ? `${formatHours(queuedHours)} en file` : "file vide",
      tone: "calm",
    },
    { href: "/admin/sav", icon: LifeBuoy, label: "SAV", value: reportsRes.count ?? 0, note: "à traiter", tone: "alert" },
    { href: "/admin/stock", icon: Cylinder, label: "Stock", value: lowStock, note: "à racheter", tone: "warn" },
    { href: "/admin/atelier", icon: Wrench, label: "Maintenance", value: maintenance, note: "imprimante(s) à entretenir", tone: "warn" },
    { href: "/admin/todo", icon: CheckSquare, label: "Tâches urgentes", value: todosRes.count ?? 0, note: "dans la to-do", tone: "calm" },
  ];
  const attention = todo.filter((t) => t.value > 0);

  const events = (eventsRes.data ?? []) as OrderEvent[];
  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? user?.email?.split(/[.@]/)[0] ?? "";
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }).format(now));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-[22px]">
          {hour < 18 ? "Bonjour" : "Bonsoir"}
          {firstName && ` ${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}`}
        </h1>
        <p className="mt-0.5 text-[13px] text-muted first-letter:uppercase">
          {dayFmt.format(now)} ·{" "}
          {attention.length ? `${attention.reduce((n, t) => n + t.value, 0)} point(s) demandent ton attention` : "rien d'urgent, tout roule"}
        </p>
      </div>

      {/* À faire aujourd'hui */}
      <section aria-label="Aujourd'hui" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {todo.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`group rounded-lg border bg-panel px-3 py-2.5 transition hover:border-line-strong ${
              t.value > 0 && t.tone === "alert" ? "border-red-400/30" : t.value > 0 && t.tone === "warn" ? "border-amber-400/30" : "border-line"
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
              <t.icon size={13} aria-hidden />
              {t.label}
            </div>
            <p className={`mt-1 font-mono text-[20px] leading-none ${t.value === 0 ? "text-muted/60" : t.tone === "alert" ? "text-red-300" : t.tone === "warn" ? "text-amber-300" : ""}`}>
              {t.value}
            </p>
            <p className="mt-1 truncate text-[11px] text-muted">{t.note}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <KeyFigures periods={periods} pipeline={pipeline} resetAt={resetAt?.toISOString() ?? null} />
          <RevenueChart data={monthlyRevenue(paid, now)} />
          <ActivityGrid grid={activityGrid(orders)} total={orders.length} />
        </div>

        <aside className="space-y-4">
          <GoalCard goal={goal} monthRevenue={month.cur.revenue} projected={projection.projected} daysLeft={projection.daysLeft} />

          <section className="rounded-lg border border-line bg-panel">
            <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <h2 className="text-[13px] font-medium">Activité récente</h2>
              <Link href="/admin/commandes" className="text-[11.5px] text-muted hover:text-fg">
                Commandes →
              </Link>
            </header>
            {events.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12.5px] text-muted">Pas encore d&apos;activité.</p>
            ) : (
              <ol className="divide-y divide-line">
                {events.map((e) => (
                  <li key={e.id}>
                    <Link href={`/admin/commandes/${e.order_id}`} className="block px-4 py-2 transition hover:bg-fg/[0.03]">
                      <p className="truncate text-[12.5px]">{e.body}</p>
                      <p className="text-[11px] text-muted">
                        {eventLabel[e.kind]} · {orderRef(e.order_id)} · {ago(e.created_at, now)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {late > 0 && (
            <p className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-400/[0.06] px-3.5 py-2.5 text-[12.5px]">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-300" aria-hidden />
              {late} commande(s) ont dépassé la date promise au client.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
