"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Period } from "@/lib/dashboard";
import { formatPrice } from "@/lib/site";

type Stats = { revenue: number; doneCount: number; average: number; newOrders: number };
type Row = { period: Period; cur: Stats; prev: Stats; revenueChange: number | null; ordersChange: number | null; averageChange: number | null };

const labels: Record<Period, { tab: string; vs: string }> = {
  jour: { tab: "Aujourd'hui", vs: "vs hier à la même heure" },
  semaine: { tab: "Semaine", vs: "vs la semaine dernière" },
  mois: { tab: "Mois", vs: "vs le mois dernier à date" },
  année: { tab: "Année", vs: "vs l'an dernier à date" },
};

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[11px] text-muted">—</span>;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono text-[11px] ${value > 0 ? "text-accent" : value < 0 ? "text-red-300" : "text-muted"}`}>
      <Icon size={11} aria-hidden />
      {value > 0 ? "+" : ""}
      {value} %
    </span>
  );
}

// Chiffres clés de la période choisie, comparés à la même durée sur la période précédente.
export default function KeyFigures({ periods, pipeline, resetAt }: { periods: Row[]; pipeline: number; resetAt: string | null }) {
  const [period, setPeriod] = useState<Period>("mois");
  const row = periods.find((p) => p.period === period)!;
  const tiles = [
    { label: "Chiffre d'affaires", value: formatPrice(row.cur.revenue), change: row.revenueChange, note: `${row.cur.doneCount} commande(s) terminée(s)` },
    { label: "Nouvelles demandes", value: String(row.cur.newOrders), change: row.ordersChange, note: `${row.prev.newOrders} sur la période précédente` },
    { label: "Panier moyen", value: row.cur.doneCount ? formatPrice(row.cur.average) : "—", change: row.averageChange, note: "commandes terminées" },
    { label: "En cours", value: formatPrice(pipeline), change: null, note: "à réaliser, toutes périodes" },
  ];

  return (
    <section className="rounded-lg border border-line bg-panel">
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <h2 className="text-[13px] font-medium">Chiffres clés</h2>
        <div className="ml-auto flex rounded-md border border-line bg-bg/50 p-0.5 text-[12px]" role="tablist" aria-label="Période">
          {periods.map((p) => (
            <button
              key={p.period}
              type="button"
              role="tab"
              aria-selected={period === p.period}
              onClick={() => setPeriod(p.period)}
              className={`rounded px-2 py-0.5 transition ${period === p.period ? "bg-fg/10 text-fg" : "text-muted hover:text-fg"}`}
            >
              {labels[p.period].tab}
            </button>
          ))}
        </div>
      </header>
      <div className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
        {tiles.map((t, i) => (
          <div key={t.label} className={`px-4 py-3 ${i < 2 ? "border-b border-line sm:border-b-0" : ""} ${i % 2 === 0 ? "border-r border-line sm:border-r-0" : ""}`}>
            <p className="text-[11.5px] text-muted">{t.label}</p>
            <p className="mt-1 font-mono text-[20px] leading-none">{t.value}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5">
              {t.change !== null || i < 3 ? <Delta value={t.change} /> : null}
              <span className="truncate text-[11px] text-muted">{t.note}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="border-t border-line px-4 py-1.5 text-[11px] text-muted">
        Comparaison : {labels[period].vs}
        {resetAt && ` · chiffres comptés depuis la remise à zéro du ${new Date(resetAt).toLocaleDateString("fr-FR")}`}
      </p>
    </section>
  );
}
