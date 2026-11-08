"use client";

import { useEffect, useState } from "react";

const PRINT_MS = 9000; // durée d'une impression
const HOLD_MS = 2600; // pause sur la pièce terminée avant de recommencer
const LAYERS = 240;

// Le mot YRIS s'imprime couche par couche, en boucle, avec la buse qui balaie la couche en cours.
export default function PrintVisual() {
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    const id = window.setInterval(() => {
      const t = (performance.now() - start) % (PRINT_MS + HOLD_MS);
      setProgress(Math.min(t / PRINT_MS, 1));
    }, 50);
    return () => window.clearInterval(id);
  }, []);

  const done = progress >= 1;
  const layer = Math.max(1, Math.round(progress * LAYERS));
  const left = Math.ceil(((1 - progress) * PRINT_MS) / 1000);

  return (
    <div className="relative flex h-full flex-col" aria-hidden>
      {/* Barre d'état de l'imprimante */}
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
        <span className="tracking-[0.3em] text-fg/80">Yris · Atelier</span>
        <span className="flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${done ? "bg-accent" : "animate-pulse-dot bg-emerald-400"}`} />
          {done ? "Pièce terminée" : "Impression en cours"}
        </span>
      </div>

      {/* Zone d'impression */}
      <div className="relative mt-8 flex flex-1 items-end justify-center pb-3 sm:mt-10">
        <div className="relative h-[76px] sm:h-[112px]">
          {/* Contour de la pièce à venir */}
          <span className="print-word block select-none text-transparent [-webkit-text-stroke:1px_var(--color-line-strong)]">YRIS</span>

          {/* Partie déjà imprimée, qui monte couche par couche */}
          <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ height: `${progress * 100}%` }}>
            <span className="print-word print-layers absolute bottom-0 left-0 block select-none">YRIS</span>
          </div>

          {/* Buse, posée sur la couche en cours */}
          {!done && (
            <div className="absolute inset-x-0" style={{ bottom: `${progress * 100}%` }}>
              <div className="nozzle absolute bottom-0 -translate-x-1/2">
                <div className="h-7 w-9 rounded-md border border-line-strong bg-panel-2 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.8)]" />
                <div className="mx-auto h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-accent-2" />
                <div className="mx-auto h-1.5 w-1.5 rounded-full bg-accent-2 shadow-[0_0_14px_4px_rgb(74_222_128/0.6)]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Plateau */}
      <div className="h-2 rounded-full bg-gradient-to-r from-line via-line-strong to-line" />

      {/* Relevés */}
      <dl className="mt-6 grid grid-cols-4 gap-2 font-mono">
        {[
          ["Couche", `${String(layer).padStart(3, "0")}/${LAYERS}`],
          ["Buse", "215 °C"],
          ["Plateau", "60 °C"],
          ["Reste", done ? "0 s" : `${left} s`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-panel-2/60 px-2 py-2">
            <dt className="text-[9px] uppercase tracking-wider text-muted">{k}</dt>
            <dd className="mt-0.5 text-[11px] text-fg sm:text-xs">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-fg/10">
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
