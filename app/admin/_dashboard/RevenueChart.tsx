"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/site";

type Point = { label: string; year: number; value: number; previous: number };

// Graduations « propres » de l'axe (0, 50, 100, 150…).
function ticks(max: number) {
  if (max <= 0) return [0];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}
const short = (cents: number) => {
  const e = cents / 100;
  return e >= 1000 ? `${(e / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k€` : `${Math.round(e)} €`;
};

// Chiffre d'affaires des 12 derniers mois (colonnes) et même mois l'an dernier (trait gris).
export default function RevenueChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const highest = Math.max(...data.map((d) => Math.max(d.value, d.previous)), 0);
  // Sans aucune vente, on garde un axe lisible (0 à 100 €) au lieu de graduations à zéro.
  const max = highest > 0 ? highest : 10000;
  const axis = ticks(max);
  const top = axis[axis.length - 1] || 1;
  const total = data.reduce((n, d) => n + d.value, 0);
  const totalPrev = data.reduce((n, d) => n + d.previous, 0);
  const H = 180;

  return (
    <section className="rounded-lg border border-line bg-panel">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-2.5">
        <h2 className="text-[13px] font-medium">Chiffre d&apos;affaires · 12 mois</h2>
        <span className="font-mono text-[12px] text-muted">{formatPrice(total)}</span>
        {/* Légende */}
        <div className="ml-auto flex items-center gap-3 text-[11.5px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-chart)]" aria-hidden /> Cette année
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded bg-fg/45" aria-hidden /> Année précédente ({formatPrice(totalPrev)})
          </span>
        </div>
      </header>

      <div className="relative px-4 pb-3 pt-4">
        <div className="relative flex" style={{ height: H }}>
          {/* Axe et grille */}
          <div className="relative w-10 shrink-0">
            {axis.map((t) => (
              <span key={t} className="absolute right-2 -translate-y-1/2 font-mono text-[10px] text-muted" style={{ bottom: `${(t / top) * 100}%` }}>
                {short(t)}
              </span>
            ))}
          </div>
          <div className="relative flex-1">
            {axis.map((t) => (
              <div key={t} className="absolute inset-x-0 h-px bg-line" style={{ bottom: `${(t / top) * 100}%` }} aria-hidden />
            ))}
            <div className="absolute inset-0 flex items-end gap-0.5">
              {data.map((d, i) => (
                <div
                  key={i}
                  className="relative flex h-full flex-1 cursor-default items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${d.label} ${d.year} : ${formatPrice(d.value)}, l'an dernier ${formatPrice(d.previous)}`}
                >
                  {hover === i && <div className="absolute inset-y-0 left-0 right-0 rounded bg-fg/[0.04]" aria-hidden />}
                  <div
                    className="relative w-full max-w-6 rounded-t bg-[var(--color-chart)] transition-opacity"
                    style={{ height: `${(d.value / top) * 100}%`, minHeight: d.value ? 2 : 0, opacity: hover === null || hover === i ? 1 : 0.55 }}
                  />
                  {d.previous > 0 && (
                    <div className="absolute h-0.5 w-full max-w-6 rounded bg-fg/45" style={{ bottom: `calc(${(d.previous / top) * 100}% - 1px)` }} aria-hidden />
                  )}
                </div>
              ))}
            </div>
            {highest === 0 && (
              <p className="absolute inset-0 grid place-items-center text-[12.5px] text-muted">
                Les ventes terminées apparaîtront ici, mois par mois.
              </p>
            )}
            {/* Infobulle */}
            {hover !== null && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-line-strong bg-panel-2 px-2.5 py-1.5 text-[11.5px] shadow-[0_10px_30px_-10px_rgb(0_0_0/0.8)]"
                style={{ left: `${((hover + 0.5) / data.length) * 100}%`, top: 0 }}
              >
                <p className="font-medium capitalize">
                  {data[hover].label} {data[hover].year}
                </p>
                <p className="font-mono">{formatPrice(data[hover].value)}</p>
                <p className="text-muted">
                  l&apos;an dernier : <span className="font-mono">{formatPrice(data[hover].previous)}</span>
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="ml-10 mt-1.5 flex gap-0.5">
          {data.map((d, i) => (
            <span key={i} className={`flex-1 text-center text-[10px] capitalize ${hover === i ? "text-fg" : "text-muted"}`}>
              {d.label}
            </span>
          ))}
        </div>
      </div>

      {/* Tableau des valeurs, pour les lecteurs d'écran */}
      <table className="sr-only">
        <caption>Chiffre d&apos;affaires par mois</caption>
        <thead>
          <tr>
            <th>Mois</th>
            <th>Cette année</th>
            <th>Année précédente</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td>
                {d.label} {d.year}
              </td>
              <td>{formatPrice(d.value)}</td>
              <td>{formatPrice(d.previous)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
