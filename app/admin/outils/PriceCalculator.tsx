"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { computeQuote, quoteMaterials, sanitizeInputs, type QuoteMaterial, type Tariffs } from "@/lib/pricing";
import { formatPrice } from "@/lib/site";

const field =
  "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";
const label = "mb-1 block text-[11.5px] text-muted";

type NumField = "grams" | "hours" | "quantity" | "finishingMinutes";

// Calculateur rapide : « combien je facture cette pièce ? » sans créer de commande. Mêmes calculs que les devis.
export default function PriceCalculator({ tariffs }: { tariffs: Tariffs }) {
  const [material, setMaterial] = useState<QuoteMaterial>("PLA");
  const [delivery, setDelivery] = useState(false);
  const [text, setText] = useState<Record<NumField, string>>({ grams: "", hours: "", quantity: "1", finishingMinutes: "" });
  const num = (v: string) => Number(v.replace(",", ".")) || 0;
  const setNum = (k: NumField, v: string) => {
    if (/^\d*[.,]?\d*$/.test(v)) setText((t) => ({ ...t, [k]: v }));
  };

  const inputs = sanitizeInputs({
    material,
    delivery,
    grams: num(text.grams),
    hours: num(text.hours),
    quantity: Math.max(1, Math.round(num(text.quantity))),
    finishingMinutes: num(text.finishingMinutes),
    discountPct: 0,
  });
  const q = useMemo(() => computeQuote(inputs, tariffs), [inputs, tariffs]);
  const empty = !inputs.grams && !inputs.hours;
  const profit = q.piecesCents - q.discountCents - q.costCents;
  // Ce que rapporte chaque heure passée à la main (préparation, finition), filament et machine payés.
  const handsHours = inputs.finishingMinutes / 60;
  const perHour = handsHours > 0 ? (q.piecesCents - q.discountCents - q.materialCents - q.machineCents) / handsHours : 0;

  const rows: [string, number][] = [
    ["Filament", q.materialCents],
    ["Machine", q.machineCents],
    ["Main-d'œuvre", q.laborCents],
    ["Coût de revient", q.costCents],
    [`Marge ${tariffs.marginPct} %`, q.marginCents],
  ];

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_260px]">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="c-mat" className={label}>Matière</label>
          <select id="c-mat" value={material} onChange={(e) => setMaterial(e.target.value as QuoteMaterial)} className={field}>
            {quoteMaterials.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="c-g" className={label}>Grammes / pièce</label>
          <input id="c-g" inputMode="decimal" value={text.grams} onChange={(e) => setNum("grams", e.target.value)} placeholder="ex. 42" className={`${field} font-mono`} />
        </div>
        <div>
          <label htmlFor="c-h" className={label}>Heures / pièce</label>
          <input id="c-h" inputMode="decimal" value={text.hours} onChange={(e) => setNum("hours", e.target.value)} placeholder="ex. 2,5" className={`${field} font-mono`} />
        </div>
        <div>
          <label htmlFor="c-q" className={label}>Quantité</label>
          <input id="c-q" inputMode="numeric" value={text.quantity} onChange={(e) => setNum("quantity", e.target.value)} className={`${field} font-mono`} />
        </div>
        <div>
          <label htmlFor="c-f" className={label}>Finition (min, total)</label>
          <input id="c-f" inputMode="numeric" value={text.finishingMinutes} onChange={(e) => setNum("finishingMinutes", e.target.value)} placeholder="ex. 15" className={`${field} font-mono`} />
        </div>
        <label className="flex items-end gap-2 pb-2 text-[13px]">
          <input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} className="accent-[var(--color-accent)]" />
          Livraison ({formatPrice(tariffs.shippingCents)})
        </label>
        <p className="col-span-full text-[11.5px] text-muted">
          Grammes et heures : ceux affichés par Bambu Studio après le découpage. Les tarifs se règlent dans{" "}
          <Link href="/admin/parametres" className="underline underline-offset-2 hover:text-fg">Paramètres</Link>.
        </p>
      </div>

      <div className="rounded-md border border-line bg-bg/40 p-3.5" aria-live="polite">
        <p className="text-[11.5px] text-muted">Prix à annoncer</p>
        <p className="mt-0.5 font-mono text-[26px] leading-tight">{empty ? "—" : formatPrice(q.totalCents)}</p>
        {!empty && (
          <p className="text-[12px] text-muted">
            {inputs.quantity > 1 ? `${formatPrice(q.unitCents)} la pièce` : "pour 1 pièce"}
            {q.minimumApplied && " · minimum appliqué"}
          </p>
        )}
        <dl className="mt-3 space-y-1 border-t border-line pt-2.5 text-[12.5px]">
          {rows.map(([k, v], i) => (
            <div key={k} className={`flex justify-between ${i === 3 ? "border-t border-line pt-1 font-medium" : "text-fg/80"}`}>
              <dt>{k}</dt>
              <dd className="font-mono">{formatPrice(v)}</dd>
            </div>
          ))}
        </dl>
        {!empty && (
          <div className="mt-2.5 space-y-0.5 border-t border-line pt-2.5 text-[12px] text-muted">
            <p>
              Bénéfice : <span className="font-mono text-fg">{formatPrice(profit)}</span>
            </p>
            {handsHours > 0 && (
              <p>
                Ton temps : <span className="font-mono text-fg">{formatPrice(Math.round(perHour))}</span> / heure à la main
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
