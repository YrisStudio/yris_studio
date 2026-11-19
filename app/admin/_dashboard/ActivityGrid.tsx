"use client";

import { useState } from "react";

const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const slots = ["0-4 h", "4-8 h", "8-12 h", "12-16 h", "16-20 h", "20-24 h"];

// Quand arrivent les demandes : jour de la semaine × tranche de 4 h (une seule teinte, plus foncé = plus de demandes).
export default function ActivityGrid({ grid, total }: { grid: number[][]; total: number }) {
  const [hover, setHover] = useState<{ d: number; s: number } | null>(null);
  const max = Math.max(...grid.flat(), 1);
  const best = grid.flatMap((row, d) => row.map((v, s) => ({ v, d, s }))).sort((a, b) => b.v - a.v)[0];

  return (
    <section className="rounded-lg border border-line bg-panel">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2.5">
        <h2 className="text-[13px] font-medium">Quand arrivent les demandes</h2>
        <span className="text-[11.5px] text-muted">
          {total ? `${total} demande(s) · pic le ${days[best.d].toLowerCase()} ${slots[best.s]}` : "pas encore de données"}
        </span>
      </header>
      <div className="overflow-x-auto p-4">
        <table className="w-full min-w-[420px] border-separate border-spacing-0.5 text-[10.5px]">
          <thead>
            <tr>
              <th className="w-10" />
              {slots.map((s) => (
                <th key={s} scope="col" className="pb-1 text-center font-normal text-muted">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, d) => (
              <tr key={d}>
                <th scope="row" className="pr-2 text-right font-normal text-muted">
                  {days[d]}
                </th>
                {row.map((v, s) => {
                  const on = hover?.d === d && hover?.s === s;
                  return (
                    <td
                      key={s}
                      tabIndex={0}
                      onMouseEnter={() => setHover({ d, s })}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover({ d, s })}
                      onBlur={() => setHover(null)}
                      className={`h-7 rounded text-center font-mono transition ${on ? "ring-1 ring-fg/60" : ""}`}
                      style={{
                        background: v ? `color-mix(in srgb, var(--color-chart) ${Math.round(18 + (v / max) * 82)}%, var(--color-panel))` : "var(--color-panel-2)",
                        color: v / max > 0.55 ? "#08100b" : "var(--color-muted)",
                      }}
                      aria-label={`${days[d]} ${slots[s]} : ${v} demande(s)`}
                    >
                      {on || v === max ? v || "" : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {hover && (
          <p className="mt-2 text-[11.5px] text-muted">
            {days[hover.d]} {slots[hover.s]} : <span className="font-mono text-fg">{grid[hover.d][hover.s]}</span> demande(s)
          </p>
        )}
      </div>
    </section>
  );
}
