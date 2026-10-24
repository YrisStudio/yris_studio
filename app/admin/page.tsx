import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Euro,
  Heart,
  MessageSquareWarning,
  Package,
  RefreshCw,
  Repeat,
  Target,
  Timer,
  TrendingUp,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { advanceOrder, setMonthlyGoal } from "./actions";
import PageHeader from "./PageHeader";
import { Spotlight } from "@/components/motion";
import { Mono } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { getAllOrders, isOpen, orderAmount, type AdminOrder } from "@/lib/orders";
import { formatPrice, orderRef, products } from "@/lib/site";
import { getStock, isLow } from "@/lib/stock";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Tableau de bord" };

const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "short" });
const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

// « il y a 3 heures », « hier »…
function ago(iso: string, now: number) {
  const s = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return "à l'instant";
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

const nextLabel: Record<string, string> = {
  reçue: "Devis envoyé",
  "devis envoyé": "En impression",
  "en impression": "Terminée",
};

const statusStyle: Record<string, string> = {
  reçue: "bg-fg/10 text-fg",
  "devis envoyé": "bg-sky-500/15 text-sky-700",
  "en impression": "bg-accent/15 text-accent",
};

type Report = { id: string; name: string; created_at: string; category: string };
type Event = { at: string; icon: LucideIcon; text: React.ReactNode; href?: string; tone?: "accent" };

function Card({ title, icon: Icon, action, children, className = "" }: {
  title: string;
  icon: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-panel p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-medium">
          <Icon size={16} className="text-accent" aria-hidden />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SeeAll({ href, children = "Tout voir" }: { href: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm text-accent hover:text-fg">
      {children} <ArrowUpRight size={14} aria-hidden />
    </Link>
  );
}

export default async function AdminDashboard() {
  await requireAdmin();
  const supabase = await createClient();
  const [orders, stock, reportsRes, favRes, goalRes, signupsRes] = await Promise.all([
    getAllOrders(),
    getStock(),
    supabase.from("reports").select("id, name, created_at, category, status").order("created_at", { ascending: false }).limit(20),
    supabase.from("favorites").select("product_slug"),
    supabase.from("admin_settings").select("value").eq("key", "monthly_goal_cents").maybeSingle(),
    supabase.rpc("admin_recent_signups", { lim: 10 }),
  ]);
  const reports = (reportsRes.data ?? []) as (Report & { status: string })[];
  const favorites = (favRes.data ?? []) as { product_slug: string }[];
  const goal = typeof goalRes.data?.value === "number" ? goalRes.data.value : 0;
  const signups = (signupsRes.data ?? []) as { email: string; created_at: string }[];

  const today = new Date();
  const now = today.getTime();
  const sameMonth = (d: Date, ref: Date) => d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
  const doneAt = (o: AdminOrder) => new Date(o.updated_at ?? o.created_at);

  const done = orders.filter((o) => o.status === "terminée");
  const open = orders.filter((o) => isOpen(o.status));
  const revenue = done.reduce((n, o) => n + orderAmount(o), 0);
  const pipeline = open.reduce((n, o) => n + orderAmount(o), 0);
  const thisMonth = done.filter((o) => sameMonth(doneAt(o), today)).reduce((n, o) => n + orderAmount(o), 0);
  const openReports = reports.filter((r) => r.status === "nouveau").length;

  // Objectif du mois.
  const goalPct = goal > 0 ? Math.min(100, Math.round((thisMonth / goal) * 100)) : 0;
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - today.getDate();

  // Chiffre d'affaires sur 6 mois.
  const months = Array.from({ length: 6 }, (_, i) => new Date(today.getFullYear(), today.getMonth() - 5 + i, 1));
  const perMonth = months.map((m) => done.filter((o) => sameMonth(doneAt(o), m)).reduce((n, o) => n + orderAmount(o), 0));
  const max = Math.max(...perMonth, 1);

  // File d'impression : la plus ancienne en premier.
  const queue = [...open].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const late = (o: AdminOrder) => now - new Date(o.created_at).getTime() > 48 * 3600 * 1000;

  // Activité récente.
  const events: Event[] = [
    ...orders.map((o) => ({
      at: o.created_at,
      icon: Package,
      text: (
        <>
          <span className="font-medium">{o.customer_name ?? "Un client"}</span>{" "}
          {o.kind === "commande" ? `a commandé ${o.product_name ?? "un article"}` : o.kind === "projet" ? "propose un projet" : "demande un devis"}
        </>
      ),
      href: `/admin/commandes?statut=toutes#${o.id}`,
    })),
    ...orders
      .filter((o) => o.updated_at && o.updated_at !== o.created_at)
      .map((o) => ({
        at: o.updated_at!,
        icon: RefreshCw,
        text: (
          <>
            Commande <span className="font-mono">{orderRef(o.id)}</span> passée en <span className="font-medium">{o.status}</span>
          </>
        ),
        href: `/admin/commandes?statut=toutes#${o.id}`,
      })),
    ...reports.map((r) => ({
      at: r.created_at,
      icon: MessageSquareWarning,
      text: (
        <>
          <span className="font-medium">{r.name}</span> a signalé un problème
        </>
      ),
      href: "/admin/signalements",
      tone: "accent" as const,
    })),
    ...signups.map((u) => ({
      at: u.created_at,
      icon: UserPlus,
      text: (
        <>
          Nouveau compte : <span className="font-mono text-[13px]">{u.email}</span>
        </>
      ),
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 10);

  // Clients fidèles : au moins 2 commandes.
  const clients = new Map<string, { name: string; email: string; count: number; spent: number }>();
  for (const o of orders) {
    const key = o.customer_email?.toLowerCase() ?? o.user_id;
    if (!key) continue;
    const c = clients.get(key) ?? { name: o.customer_name ?? "Client", email: o.customer_email ?? "", count: 0, spent: 0 };
    c.count += 1;
    if (o.status === "terminée") c.spent += orderAmount(o);
    clients.set(key, c);
  }
  const loyal = [...clients.values()]
    .filter((c) => c.count >= 2)
    .sort((a, b) => b.count - a.count || b.spent - a.spent)
    .slice(0, 5);

  // Favoris les plus populaires, et combien de fois ils ont été commandés.
  const favCount = new Map<string, number>();
  for (const f of favorites) favCount.set(f.product_slug, (favCount.get(f.product_slug) ?? 0) + 1);
  const popular = [...favCount]
    .map(([slug, count]) => ({
      product: products.find((p) => p.slug === slug),
      count,
      ordered: orders.filter((o) => o.product_slug === slug).length,
    }))
    .filter((p) => p.product)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxFav = Math.max(...popular.map((p) => p.count), 1);

  const lowStock = stock.filter(isLow);

  const kpis = [
    { label: "Chiffre d'affaires réalisé", value: formatPrice(revenue), note: `${done.length} commande(s) terminée(s)`, icon: Euro },
    { label: "Ce mois-ci", value: formatPrice(thisMonth), note: "commandes terminées", icon: TrendingUp },
    { label: "En cours", value: formatPrice(pipeline), note: `${open.length} commande(s) à réaliser`, icon: Timer },
    { label: "Signalements", value: String(openReports), note: "non traités", icon: MessageSquareWarning },
  ];

  return (
    <div>
      <PageHeader title="Tableau de bord" description="Vue d'ensemble de l'activité de l'atelier." />

      <div className="space-y-4">
        {/* Objectif du mois */}
        <section className="theme-dark grid-bg relative overflow-hidden rounded-2xl p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/25 blur-[100px]" />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <Mono className="flex items-center gap-1.5 text-accent-2">
                <Target size={13} aria-hidden /> Objectif de {new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(today)}
              </Mono>
              <p className="mt-3 text-4xl font-medium tracking-tight sm:text-5xl">
                {formatPrice(thisMonth)}
                <span className="text-xl text-muted sm:text-2xl"> / {goal > 0 ? formatPrice(goal) : "aucun objectif"}</span>
              </p>
              <p className="mt-2 text-sm text-muted">
                {goal === 0
                  ? "Fixez un objectif pour suivre votre progression."
                  : thisMonth >= goal
                    ? "Objectif atteint, bravo !"
                    : `Encore ${formatPrice(goal - thisMonth)} à réaliser, ${daysLeft} jour(s) restant(s).`}
              </p>
            </div>
            <form action={setMonthlyGoal} className="flex items-center gap-2">
              <label htmlFor="goal" className="sr-only">Objectif du mois en euros</label>
              <input
                id="goal"
                name="goal"
                inputMode="decimal"
                defaultValue={goal > 0 ? String(goal / 100) : ""}
                placeholder="500"
                className="w-28 rounded-lg border border-line-strong bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <span className="text-sm text-muted">€</span>
              <button type="submit" className="rounded-lg border border-line-strong bg-panel-2 px-3 py-2 text-sm hover:bg-white/10">
                Modifier
              </button>
            </form>
          </div>
          <div className="relative mt-6 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-700"
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <p className="relative mt-2 text-right font-mono text-xs text-muted">{goalPct} %</p>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <Spotlight key={k.label} className="p-5">
              <div className="flex items-center justify-between">
                <Mono>{k.label}</Mono>
                <k.icon size={16} className="text-accent" aria-hidden />
              </div>
              <p className="mt-4 text-3xl font-medium tracking-tight">{k.value}</p>
              <p className="mt-1 text-xs text-muted">{k.note}</p>
            </Spotlight>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          {/* File d'impression */}
          <Card title="File d'impression" icon={Timer} action={<SeeAll href="/admin/commandes?statut=a-realiser" />}>
            {queue.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Rien à imprimer pour l&apos;instant.</p>
            ) : (
              <ol className="divide-y divide-line">
                {queue.slice(0, 8).map((o, i) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-fg/5 font-mono text-xs">{i + 1}</span>
                    <Link href={`/admin/commandes?statut=a-realiser#${o.id}`} className="min-w-0 flex-1 hover:text-accent">
                      <span className="block truncate text-sm font-medium">
                        {o.product_name ?? o.details?.slice(0, 60) ?? "Demande"}
                        {o.quantity > 1 && <span className="text-muted"> × {o.quantity}</span>}
                      </span>
                      <span className="font-mono text-[11px] text-muted">
                        {orderRef(o.id)} · {o.customer_name ?? "client"} · {o.material ?? "matériau à choisir"}
                      </span>
                    </Link>
                    <span
                      className={`rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                        late(o) ? "bg-red-500/15 text-red-700" : "bg-fg/5 text-muted"
                      }`}
                      title="Ancienneté de la demande"
                    >
                      {ago(o.created_at, now)}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusStyle[o.status] ?? ""}`}>
                      {o.status}
                    </span>
                    {nextLabel[o.status] && (
                      <form action={advanceOrder.bind(null, o.id, o.status)}>
                        <button
                          type="submit"
                          title={`Passer en « ${nextLabel[o.status].toLowerCase()} »`}
                          className="inline-flex items-center gap-1 rounded-lg bg-fg px-2.5 py-1 text-xs text-bg transition hover:opacity-85"
                        >
                          {nextLabel[o.status]} <ArrowRight size={12} aria-hidden />
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {/* Activité récente */}
          <Card title="Activité récente" icon={RefreshCw}>
            {events.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Pas encore d&apos;activité.</p>
            ) : (
              <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-line">
                {events.map((e, i) => {
                  const body = (
                    <>
                      <span
                        className={`relative grid size-8 shrink-0 place-items-center rounded-full border bg-panel ${
                          e.tone === "accent" ? "border-accent/40 text-accent" : "border-line text-muted"
                        }`}
                      >
                        <e.icon size={14} aria-hidden />
                      </span>
                      <span className="min-w-0 pt-1">
                        <span className="block text-sm">{e.text}</span>
                        <span className="font-mono text-[11px] text-muted">{ago(e.at, now)}</span>
                      </span>
                    </>
                  );
                  return (
                    <li key={i}>
                      {e.href ? (
                        <Link href={e.href} className="flex gap-3 hover:text-accent">
                          {body}
                        </Link>
                      ) : (
                        <div className="flex gap-3">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {/* Chiffre d'affaires */}
          <Card title="Chiffre d'affaires, 6 mois" icon={TrendingUp}>
            <div className="flex h-44 items-end gap-2">
              {perMonth.map((v, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="font-mono text-[9px] text-muted">{v ? formatPrice(v) : ""}</span>
                  <span
                    className="w-full rounded-t-md bg-gradient-to-t from-accent to-accent-2"
                    style={{ height: `${Math.max((v / max) * 100, v ? 4 : 1)}%`, opacity: v ? 1 : 0.15 }}
                  />
                  <span className="font-mono text-[10px] uppercase text-muted">{monthFmt.format(months[i])}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Stock */}
          <Card title="Stock de filament" icon={AlertTriangle} action={<SeeAll href="/admin/stock">Gérer</SeeAll>}>
            {stock.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                Aucune bobine. <Link href="/admin/stock" className="text-accent underline">Ajouter vos bobines</Link>
              </p>
            ) : (
              <>
                <p className={`mb-4 text-sm ${lowStock.length ? "text-accent" : "text-emerald-700"}`}>
                  {lowStock.length ? `${lowStock.length} bobine(s) à racheter` : "Tout est en stock"}
                </p>
                <ul className="space-y-3">
                  {[...stock]
                    .sort((a, b) => a.grams_left / a.spool_grams - b.grams_left / b.spool_grams)
                    .slice(0, 5)
                    .map((s) => (
                      <li key={s.id} className="flex items-center gap-3">
                        <span className="size-4 shrink-0 rounded-full border border-line-strong" style={{ background: s.color_hex }} />
                        <span className="w-28 truncate text-sm">
                          {s.material} {s.color}
                        </span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-fg/10">
                          <span
                            className={`block h-full rounded-full ${isLow(s) ? "bg-accent" : "bg-emerald-500"}`}
                            style={{ width: `${Math.round((s.grams_left / s.spool_grams) * 100)}%` }}
                          />
                        </span>
                        <span className="w-14 text-right font-mono text-[11px] text-muted">{s.grams_left} g</span>
                      </li>
                    ))}
                </ul>
              </>
            )}
          </Card>

          {/* Clients fidèles */}
          <Card title="Clients fidèles" icon={Repeat} action={<SeeAll href="/admin/clients" />}>
            {loyal.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Les clients qui commandent au moins deux fois apparaîtront ici.</p>
            ) : (
              <ul className="divide-y divide-line">
                {loyal.map((c) => (
                  <li key={c.email || c.name} className="flex items-center gap-3 py-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-2 to-accent text-xs font-medium text-white">
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{c.name}</span>
                      <span className="block truncate font-mono text-[11px] text-muted">{c.email}</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-mono text-sm">{c.count} cmd</span>
                      <span className="block font-mono text-[11px] text-muted">{formatPrice(c.spent)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Favoris les plus populaires */}
          <Card title="Favoris les plus populaires" icon={Heart} className="lg:col-span-2 xl:col-span-3">
            {popular.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Aucun article en favori pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-3">
                {popular.map((p) => (
                  <li key={p.product!.slug} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[220px_1fr_auto]">
                    <span className="truncate text-sm font-medium">{p.product!.name}</span>
                    <span className="order-3 col-span-2 h-2 overflow-hidden rounded-full bg-fg/10 sm:order-none sm:col-span-1">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
                        style={{ width: `${(p.count / maxFav) * 100}%` }}
                      />
                    </span>
                    <span className="text-right font-mono text-xs text-muted">
                      <Heart size={11} className="mr-1 inline fill-accent text-accent" aria-hidden />
                      {p.count} · commandé {p.ordered}×
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted">
              Un article souvent mis en favori mais peu commandé ? C&apos;est peut-être le moment d&apos;une petite promo.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
