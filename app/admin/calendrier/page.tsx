import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "../PageHeader";
import { requireAdmin } from "@/lib/admin";
import { planPrinter } from "@/lib/atelier";
import { getPrintJobs } from "@/lib/atelier-server";
import { getAllOrders } from "@/lib/orders";

export const metadata = { title: "Calendrier" };

type Kind = "livraison" | "impression" | "devis" | "demande" | "terminee";
type CalEvent = { day: string; kind: Kind; label: string; href: string; time?: string; late?: boolean };

const kinds: Record<Kind, { label: string; dot: string }> = {
  livraison: { label: "Date promise", dot: "bg-amber-400" },
  impression: { label: "Fin d'impression", dot: "bg-accent" },
  devis: { label: "Devis qui expire", dot: "bg-sky-400" },
  demande: { label: "Demande reçue", dot: "bg-fg/50" },
  terminee: { label: "Commande terminée", dot: "bg-accent/40" },
};

const TZ = "Europe/Paris";
// Jour « AAAA-MM-JJ » à l'heure de Paris.
const dayKey = (d: Date) => new Intl.DateTimeFormat("fr-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const longDay = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function monthParam(raw: string | undefined, today: string) {
  const m = raw?.match(/^(\d{4})-(\d{2})$/);
  const [y, mo] = m ? [Number(m[1]), Number(m[2])] : [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  return { y, mo: Math.min(12, Math.max(1, mo)) };
}
const ym = (y: number, mo: number) => {
  const d = new Date(Date.UTC(y, mo - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  await requireAdmin();
  const now = new Date();
  const today = dayKey(now);
  const { y, mo } = monthParam((await searchParams).mois, today);
  const [orders, jobs] = await Promise.all([getAllOrders(), getPrintJobs()]);

  // Tous les évènements connus, tirés des commandes et de la file d'impression.
  const events: CalEvent[] = [];
  const name = (o: (typeof orders)[number]) => `${o.product_name ?? "Sur mesure"} · ${o.customer_name || o.customer_email || "client"}`;
  for (const o of orders) {
    const href = `/admin/commandes/${o.id}`;
    const open = o.status !== "terminée" && o.status !== "annulée";
    events.push({ day: dayKey(new Date(o.created_at)), kind: "demande", label: name(o), href, time: timeFmt.format(new Date(o.created_at)) });
    if (o.due_date && open) events.push({ day: o.due_date, kind: "livraison", label: name(o), href, late: o.due_date < today });
    if (o.status === "devis envoyé" && o.quote_date) {
      const until = new Date(new Date(o.quote_date).getTime() + 30 * 86_400_000);
      events.push({ day: dayKey(until), kind: "devis", label: `${o.quote_number ?? "Devis"} · ${o.customer_name || o.customer_email || "client"}`, href });
    }
    if (o.status === "terminée") events.push({ day: dayKey(new Date(o.updated_at ?? o.created_at)), kind: "terminee", label: name(o), href });
  }
  const printerIds = [...new Set(jobs.active.map((j) => j.printer_id).filter(Boolean))] as string[];
  for (const pid of printerIds) {
    const plan = planPrinter(jobs.active.filter((j) => j.printer_id === pid), now);
    for (const j of jobs.active.filter((x) => x.printer_id === pid)) {
      const slot = plan.get(j.id);
      if (slot) events.push({ day: dayKey(slot.end), kind: "impression", label: j.title, href: j.order_id ? `/admin/commandes/${j.order_id}` : "/admin/atelier", time: timeFmt.format(slot.end) });
    }
  }
  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);
  const order: Kind[] = ["livraison", "impression", "devis", "demande", "terminee"];
  for (const list of byDay.values()) list.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || (a.time ?? "").localeCompare(b.time ?? ""));

  // Grille du mois : semaines du lundi au dimanche.
  const first = new Date(Date.UTC(y, mo - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, i) => new Date(Date.UTC(y, mo - 1, 1 - offset + i)));
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const monthDays = cells.filter((d) => d.getUTCMonth() === mo - 1 && byDay.has(key(d)));
  const inMonth = events.filter((e) => e.day.startsWith(ym(y, mo)));
  const promised = inMonth.filter((e) => e.kind === "livraison").length;

  return (
    <div className="space-y-4">
      <PageHeader title="Calendrier" description={`${promised} livraison(s) promise(s) ce mois-ci · tout est tiré des commandes et de la file d'impression.`} />

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-[15px] font-medium capitalize">{monthFmt.format(first)}</h2>
        <Link href={`/admin/calendrier?mois=${ym(y, mo - 1)}`} aria-label="Mois précédent" className="rounded-md border border-line p-1.5 text-muted hover:text-fg">
          <ChevronLeft size={15} aria-hidden />
        </Link>
        <Link href="/admin/calendrier" className="rounded-md border border-line px-2.5 py-1 text-[12.5px] text-muted hover:text-fg">
          Aujourd&apos;hui
        </Link>
        <Link href={`/admin/calendrier?mois=${ym(y, mo + 1)}`} aria-label="Mois suivant" className="rounded-md border border-line p-1.5 text-muted hover:text-fg">
          <ChevronRight size={15} aria-hidden />
        </Link>
      </div>

      {/* Légende */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
        {order.map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${kinds[k].dot}`} aria-hidden /> {kinds[k].label}
          </li>
        ))}
      </ul>

      {/* Ordinateur : grille du mois */}
      <div className="hidden overflow-hidden rounded-lg border border-line bg-panel md:block">
        <div className="grid grid-cols-7 border-b border-line text-[11px] text-muted">
          {weekdays.map((d) => (
            <div key={d} className="px-2 py-1.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const k = key(d);
            const list = byDay.get(k) ?? [];
            const out = d.getUTCMonth() !== mo - 1;
            return (
              <div key={k} className={`min-h-28 border-line p-1.5 ${i % 7 ? "border-l" : ""} ${i >= 7 ? "border-t" : ""} ${out ? "bg-bg/40" : ""}`}>
                <p
                  className={`mb-1 inline-grid size-6 place-items-center rounded-full font-mono text-[11.5px] ${
                    k === today ? "bg-accent font-medium text-on-accent" : out ? "text-muted/50" : "text-muted"
                  }`}
                >
                  {d.getUTCDate()}
                </p>
                <ul className="space-y-0.5">
                  {list.slice(0, 4).map((e, j) => (
                    <li key={j}>
                      <Link
                        href={e.href}
                        title={`${kinds[e.kind].label} · ${e.label}`}
                        className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-[11.5px] hover:bg-fg/[0.06] ${e.late ? "text-red-300" : out ? "text-fg/50" : "text-fg/85"}`}
                      >
                        <span className={`size-1.5 shrink-0 rounded-full ${e.late ? "bg-red-400" : kinds[e.kind].dot}`} aria-hidden />
                        <span className="truncate">
                          {e.time && <span className="font-mono text-muted">{e.time} </span>}
                          {e.label}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {list.length > 4 && <li className="px-1 text-[11px] text-muted">+ {list.length - 4} autre(s)</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Téléphone : liste des jours du mois qui ont quelque chose */}
      <div className="space-y-3 md:hidden">
        {monthDays.length === 0 && <p className="rounded-lg border border-line bg-panel px-4 py-8 text-center text-[13px] text-muted">Rien de prévu ce mois-ci.</p>}
        {monthDays.map((d) => {
          const k = key(d);
          return (
            <section key={k} className="rounded-lg border border-line bg-panel">
              <h3 className={`border-b border-line px-3.5 py-2 text-[12.5px] font-medium first-letter:uppercase ${k === today ? "text-accent" : ""}`}>
                {longDay.format(d)}
                {k === today && " · aujourd'hui"}
              </h3>
              <ul className="divide-y divide-line">
                {byDay.get(k)!.map((e, j) => (
                  <li key={j}>
                    <Link href={e.href} className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px]">
                      <span className={`size-2 shrink-0 rounded-full ${e.late ? "bg-red-400" : kinds[e.kind].dot}`} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate ${e.late ? "text-red-300" : ""}`}>{e.label}</span>
                        <span className="block text-[11.5px] text-muted">
                          {kinds[e.kind].label}
                          {e.time && ` · ${e.time}`}
                          {e.late && " · en retard"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
