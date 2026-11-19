"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, Search, UserRound } from "lucide-react";
import { clientKey, isInactive, type ClientSummary } from "@/lib/clients";
import { formatPrice } from "@/lib/site";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "2-digit" });

type Filter = "tous" | "pros" | "acheteurs" | "inactifs" | "comptes";
type Sort = "recent" | "depense" | "commandes" | "nom";

export default function ClientsList({ clients, nowIso }: { clients: ClientSummary[]; nowIso: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("tous");
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("recent");
  const now = useMemo(() => new Date(nowIso), [nowIso]);

  const tags = useMemo(() => [...new Set(clients.flatMap((c) => c.tags))].sort(), [clients]);
  const counts = {
    tous: clients.length,
    pros: clients.filter((c) => c.isPro).length,
    acheteurs: clients.filter((c) => c.spentCents > 0).length,
    inactifs: clients.filter((c) => isInactive(c, now)).length,
    comptes: clients.filter((c) => c.hasAccount).length,
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => {
        if (filter === "pros" && !c.isPro) return false;
        if (filter === "acheteurs" && c.spentCents === 0) return false;
        if (filter === "inactifs" && !isInactive(c, now)) return false;
        if (filter === "comptes" && !c.hasAccount) return false;
        if (tag && !c.tags.includes(tag)) return false;
        if (!q) return true;
        return [c.name, c.email, c.company, c.phone, c.city, ...c.tags].filter(Boolean).join(" ").toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sort === "depense") return b.spentCents - a.spentCents;
        if (sort === "commandes") return b.orders - a.orders;
        if (sort === "nom") return a.name.localeCompare(b.name, "fr");
        return (b.lastOrder ?? b.accountSince ?? "").localeCompare(a.lastOrder ?? a.accountSince ?? "");
      });
  }, [clients, query, filter, tag, sort, now]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, email, société, ville…"
            aria-label="Rechercher un client"
            className="h-8 w-full rounded-md border border-line bg-panel pl-8 pr-2.5 text-base text-fg outline-none placeholder:text-muted/70 focus:border-accent sm:text-[13px]"
          />
        </label>
        <div className="flex flex-wrap rounded-md border border-line bg-panel p-0.5 text-[12.5px]" role="group" aria-label="Filtre">
          {(
            [
              ["tous", "Tous"],
              ["acheteurs", "Acheteurs"],
              ["pros", "Pros"],
              ["inactifs", "Inactifs 90 j"],
              ["comptes", "Avec compte"],
            ] as const
          ).map(([f, l]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded px-2 py-1 transition ${filter === f ? "bg-fg/10 text-fg" : "text-muted hover:text-fg"}`}
            >
              {l} <span className="font-mono text-[10.5px] opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Trier"
          className="ml-auto h-8 rounded-md border border-line bg-panel px-2 text-[12.5px] text-muted outline-none"
        >
          <option value="recent">Plus récents</option>
          <option value="depense">Plus gros clients</option>
          <option value="commandes">Plus de commandes</option>
          <option value="nom">Nom</option>
        </select>
      </div>

      {tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(tag === t ? null : t)}
              aria-pressed={tag === t}
              className={`rounded-full border px-2.5 py-0.5 text-[12px] transition ${
                tag === t ? "border-accent bg-accent/15 text-accent" : "border-line text-muted hover:text-fg"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-10 text-center text-[13px] text-muted">Aucun client.</p>
      ) : (
        <>
          {/* Tableau (ordinateur) */}
          <div className="hidden overflow-hidden rounded-lg border border-line md:block">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-line bg-panel text-[11.5px] text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium">Étiquettes</th>
                  <th className="px-3 py-2 text-right font-medium">Commandes</th>
                  <th className="px-3 py-2 text-right font-medium">Dépensé</th>
                  <th className="px-3 py-2 font-medium">Dernière</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((c) => (
                  <tr key={c.email} className="transition hover:bg-fg/[0.03]">
                    <td className="max-w-[320px] px-3 py-2">
                      <Link href={`/admin/clients/${clientKey(c.email)}`} className="flex items-center gap-2.5 hover:text-accent">
                        <Avatar c={c} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 truncate font-medium">
                            {c.name}
                            {c.isPro && <Briefcase size={12} className="shrink-0 text-sky-300" aria-label="Client pro" />}
                          </span>
                          <span className="block truncate text-[11.5px] text-muted">{c.company ?? c.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Tags tags={c.tags} />
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {c.orders}
                      {c.open > 0 && <span className="ml-1 text-[11px] text-amber-300">({c.open} en cours)</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{c.spentCents ? formatPrice(c.spentCents) : "—"}</td>
                    <td className={`px-3 py-2 text-[12px] ${isInactive(c, now) ? "text-amber-300" : "text-muted"}`}>
                      {c.lastOrder ? dateFmt.format(new Date(c.lastOrder)) : c.hasAccount ? "Compte seul" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cartes (téléphone) */}
          <ul className="space-y-2 md:hidden">
            {list.map((c) => (
              <li key={c.email}>
                <Link href={`/admin/clients/${clientKey(c.email)}`} className="flex items-center gap-3 rounded-lg border border-line bg-panel p-3">
                  <Avatar c={c} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-[13.5px] font-medium">
                      {c.name}
                      {c.isPro && <Briefcase size={12} className="shrink-0 text-sky-300" aria-label="Client pro" />}
                    </span>
                    <span className="block truncate text-[11.5px] text-muted">
                      {c.orders} commande(s) · {c.spentCents ? formatPrice(c.spentCents) : "0 €"}
                    </span>
                    {c.tags.length > 0 && (
                      <span className="mt-1 block">
                        <Tags tags={c.tags} />
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Avatar({ c }: { c: ClientSummary }) {
  return (
    <span className={`grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${c.isPro ? "bg-sky-400/15 text-sky-300" : "bg-fg/10 text-fg/80"}`}>
      {c.name ? c.name.charAt(0).toUpperCase() : <UserRound size={14} aria-hidden />}
    </span>
  );
}

function Tags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span className="text-[12px] text-muted/60">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} className="rounded bg-fg/[0.07] px-1.5 py-px text-[11px] text-fg/80">
          {t}
        </span>
      ))}
    </span>
  );
}
