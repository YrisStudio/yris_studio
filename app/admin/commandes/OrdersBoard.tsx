"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Columns3, List, Search, Zap } from "lucide-react";
import { setOrderStatus } from "./actions";
import type { AdminOrder } from "@/lib/orders";
import { boardStatuses, kindLabel, statusMeta } from "@/lib/orders-meta";
import { formatPrice, orderRef, type OrderStatus } from "@/lib/site";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

function ago(iso: string) {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days === 0) {
    const hours = Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000);
    return hours === 0 ? "à l'instant" : rtf.format(hours, "hour");
  }
  return rtf.format(days, "day");
}

const amount = (o: AdminOrder) => o.final_cents ?? o.estimated_cents;
const late = (o: AdminOrder) =>
  Boolean(o.due_date) && o.status !== "terminée" && o.status !== "annulée" && new Date(`${o.due_date}T23:59:59`) < new Date();
const title = (o: AdminOrder) => o.product_name ?? o.details?.split("\n")[0]?.slice(0, 80) ?? "Demande sans titre";

type View = "kanban" | "liste";
const kinds = ["tous", "commande", "sur-mesure", "projet"] as const;

export default function OrdersBoard({ orders }: { orders: AdminOrder[] }) {
  const [view, setView] = useState<View>("kanban");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<(typeof kinds)[number]>("tous");
  const [showCancelled, setShowCancelled] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Le déplacement s'affiche tout de suite ; l'enregistrement suit en arrière-plan.
  const [optimistic, moveOptimistic] = useOptimistic(orders, (list, m: { id: string; status: string }) =>
    list.map((o) => (o.id === m.id ? { ...o, status: m.status } : o)),
  );

  function move(id: string, status: string) {
    const order = optimistic.find((o) => o.id === id);
    if (!order || order.status === status) return;
    setError(null);
    startTransition(async () => {
      moveOptimistic({ id, status });
      const res = await setOrderStatus(id, status);
      if (res.status === "error") setError(res.message ?? "Erreur");
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return optimistic.filter((o) => {
      if (kind !== "tous" && o.kind !== kind) return false;
      if (!q) return true;
      return [orderRef(o.id), o.customer_name, o.customer_email, o.customer_company, o.product_name, o.details, o.city, o.quote_number]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [optimistic, query, kind]);

  const columns: OrderStatus[] = [...boardStatuses, ...(showCancelled ? (["annulée"] as const) : [])];
  // Urgentes d'abord, puis la date promise la plus proche, puis la plus ancienne.
  const sorted = (list: AdminOrder[]) =>
    [...list].sort(
      (a, b) =>
        Number(b.priority === "urgente") - Number(a.priority === "urgente") ||
        (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") ||
        a.created_at.localeCompare(b.created_at),
    );

  return (
    <div>
      {/* Barre d'outils */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Client, référence, pièce…"
            aria-label="Rechercher une commande"
            className="h-8 w-full rounded-md border border-line bg-panel pl-8 pr-2.5 text-base text-fg outline-none transition placeholder:text-muted/70 focus:border-accent sm:text-[13px]"
          />
        </label>
        <div className="flex rounded-md border border-line bg-panel p-0.5 text-[12.5px]" role="group" aria-label="Type de demande">
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`rounded px-2 py-1 transition ${kind === k ? "bg-fg/10 text-fg" : "text-muted hover:text-fg"}`}
            >
              {k === "tous" ? "Tous" : kindLabel[k]}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-muted">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="accent-[var(--color-accent)]" />
          Annulées
        </label>
        <div className="ml-auto flex rounded-md border border-line bg-panel p-0.5" role="group" aria-label="Affichage">
          {(
            [
              ["kanban", Columns3, "Kanban"],
              ["liste", List, "Liste"],
            ] as const
          ).map(([v, Icon, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              title={label}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-[12.5px] transition ${view === v ? "bg-fg/10 text-fg" : "text-muted hover:text-fg"}`}
            >
              <Icon size={14} aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
          {error}
        </p>
      )}

      {view === "kanban" ? (
        // Colonnes côte à côte ; sur téléphone elles défilent à l'horizontale, une colonne par écran.
        <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-3 [scrollbar-width:thin] sm:-mx-6 sm:px-6 lg:mx-0 lg:snap-none lg:px-0">
          {columns.map((status) => {
            const items = sorted(filtered.filter((o) => o.status === status));
            const total = items.reduce((n, o) => n + (amount(o) ?? 0), 0);
            const meta = statusMeta[status];
            return (
              <section
                key={status}
                aria-label={meta.label}
                onDragOver={(e) => {
                  if (!dragged) return;
                  e.preventDefault();
                  setOver(status);
                }}
                onDragLeave={() => setOver((s) => (s === status ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragged) move(dragged, status);
                  setDragged(null);
                  setOver(null);
                }}
                className={`flex w-[85vw] max-w-[320px] shrink-0 snap-start flex-col rounded-lg border bg-panel/60 transition-colors sm:w-[290px] lg:w-auto lg:max-w-none lg:flex-1 lg:basis-0 ${
                  over === status ? "border-accent/60 bg-accent/[0.04]" : "border-line"
                }`}
              >
                <header className="flex items-center gap-2 border-b border-line px-3 py-2">
                  <span className={`size-2 rounded-full ${meta.dot}`} aria-hidden />
                  <h2 className="text-[13px] font-medium">{meta.label}</h2>
                  <span className="font-mono text-[11px] text-muted">{items.length}</span>
                  {total > 0 && <span className="ml-auto font-mono text-[11px] text-muted">{formatPrice(total)}</span>}
                </header>
                <ul className="flex min-h-24 flex-col gap-2 p-2">
                  {items.length === 0 && <li className="py-6 text-center text-[12px] text-muted/70">Aucune commande</li>}
                  {items.map((o) => (
                    <li
                      key={o.id}
                      draggable
                      onDragStart={(e) => {
                        setDragged(o.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDragged(null);
                        setOver(null);
                      }}
                      className={`group rounded-md border bg-panel-2 transition hover:border-line-strong ${
                        dragged === o.id ? "opacity-40" : ""
                      } ${o.priority === "urgente" ? "border-red-400/40" : "border-line"}`}
                    >
                      <Link href={`/admin/commandes/${o.id}`} className="block p-2.5" draggable={false}>
                        <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted">
                          <span>{orderRef(o.id)}</span>
                          <span>·</span>
                          <span>{kindLabel[o.kind] ?? o.kind}</span>
                          {o.priority === "urgente" && (
                            <span className="ml-auto flex items-center gap-0.5 rounded bg-red-400/15 px-1 text-red-300">
                              <Zap size={10} aria-hidden /> Urgent
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug">{title(o)}</p>
                        <p className="mt-0.5 truncate text-[12px] text-muted">
                          {o.customer_name ?? "Client"}
                          {o.quantity > 1 && ` · × ${o.quantity}`}
                          {o.material && ` · ${o.material}`}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-[11.5px]">
                          <span className="font-mono text-fg/90">{amount(o) !== null ? formatPrice(amount(o)) : "À chiffrer"}</span>
                          {o.payment === "payée" && <span className="rounded bg-accent/15 px-1 text-accent">Payée</span>}
                          {o.due_date ? (
                            <span className={`ml-auto flex items-center gap-1 ${late(o) ? "text-red-300" : "text-muted"}`}>
                              {late(o) ? <AlertTriangle size={11} aria-hidden /> : <CalendarClock size={11} aria-hidden />}
                              {dateFmt.format(new Date(`${o.due_date}T12:00:00`))}
                            </span>
                          ) : (
                            <span className="ml-auto text-muted">{ago(o.created_at)}</span>
                          )}
                        </div>
                      </Link>
                      {/* Sur téléphone, pas de glisser-déposer : on change le statut ici. */}
                      <div className="border-t border-line px-2.5 py-1.5 lg:hidden">
                        <select
                          value={o.status}
                          onChange={(e) => move(o.id, e.target.value)}
                          aria-label={`Statut de ${orderRef(o.id)}`}
                          className="w-full bg-transparent text-[12.5px] text-muted outline-none"
                        >
                          {[...boardStatuses, "annulée" as const].map((s) => (
                            <option key={s} value={s}>
                              → {statusMeta[s].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="border-b border-line bg-panel text-[11.5px] text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Réf.</th>
                <th className="px-3 py-2 font-medium">Demande</th>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 text-right font-medium">Montant</th>
                <th className="px-3 py-2 font-medium">Promise</th>
                <th className="px-3 py-2 font-medium">Reçue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sorted(filtered.filter((o) => showCancelled || o.status !== "annulée")).map((o) => (
                <tr key={o.id} className="transition hover:bg-fg/[0.03]">
                  <td className="px-3 py-2 font-mono text-[11.5px] text-muted">
                    <Link href={`/admin/commandes/${o.id}`} className="hover:text-fg">
                      {orderRef(o.id)}
                    </Link>
                  </td>
                  <td className="max-w-[260px] px-3 py-2">
                    <Link href={`/admin/commandes/${o.id}`} className="block truncate font-medium hover:text-accent">
                      {o.priority === "urgente" && <Zap size={12} className="mr-1 inline text-red-300" aria-label="Urgent" />}
                      {title(o)}
                    </Link>
                    <span className="text-[11.5px] text-muted">{kindLabel[o.kind] ?? o.kind}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="block truncate">{o.customer_name ?? "—"}</span>
                    <span className="block truncate text-[11.5px] text-muted">{o.customer_email}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11.5px] ${statusMeta[o.status as OrderStatus]?.pill ?? ""}`}>
                      {statusMeta[o.status as OrderStatus]?.label ?? o.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {amount(o) !== null ? formatPrice(amount(o)) : "—"}
                    {o.payment === "payée" && <span className="block font-sans text-[11px] text-accent">Payée</span>}
                  </td>
                  <td className={`px-3 py-2 text-[12px] ${late(o) ? "text-red-300" : "text-muted"}`}>
                    {o.due_date ? dateFmt.format(new Date(`${o.due_date}T12:00:00`)) : "—"}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-muted">{ago(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="py-10 text-center text-[13px] text-muted">Aucune commande.</p>}
        </div>
      )}
    </div>
  );
}
