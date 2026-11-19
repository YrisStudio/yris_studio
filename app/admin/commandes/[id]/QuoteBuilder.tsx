"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle, Send } from "lucide-react";
import { saveQuote } from "../actions";
import { computeQuote, quoteMaterials, sanitizeInputs, type QuoteInputs, type QuoteLine, type Tariffs } from "@/lib/pricing";
import { formatPrice } from "@/lib/site";

const field =
  "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";
const label = "mb-1 block text-[11.5px] text-muted";

type NumField = "quantity" | "grams" | "hours" | "finishingMinutes" | "discountPct";

// Générateur de devis : on saisit ce que donne Bambu Studio (grammes, heures), le prix se calcule tout seul.
export default function QuoteBuilder({
  id,
  tariffs,
  initial,
  savedLines,
  status,
}: {
  id: string;
  tariffs: Tariffs;
  initial: QuoteInputs;
  savedLines: QuoteLine[] | null;
  status: string;
}) {
  const [inputs, setInputs] = useState<QuoteInputs>(initial);
  // Texte brut des champs chiffrés : garde la virgule pendant la saisie (« 2, » avant « 2,5 »).
  const [text, setText] = useState<Record<NumField, string>>(() => ({
    quantity: String(initial.quantity),
    grams: initial.grams ? String(initial.grams).replace(".", ",") : "",
    hours: initial.hours ? String(initial.hours).replace(".", ",") : "",
    finishingMinutes: initial.finishingMinutes ? String(initial.finishingMinutes) : "",
    discountPct: initial.discountPct ? String(initial.discountPct).replace(".", ",") : "",
  }));
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const quote = useMemo(() => computeQuote(sanitizeInputs(inputs), tariffs), [inputs, tariffs]);

  const set = <K extends keyof QuoteInputs>(k: K, v: QuoteInputs[K]) => {
    setInputs((s) => ({ ...s, [k]: v }));
    setMessage(null);
  };
  const num = (v: string) => Number(v.replace(",", ".")) || 0;
  const setNum = (k: NumField, v: string) => {
    if (!/^\d*[.,]?\d*$/.test(v)) return;
    setText((t) => ({ ...t, [k]: v }));
    set(k, k === "quantity" ? Math.max(1, Math.round(num(v))) : num(v));
  };

  function submit(send: boolean) {
    if (send && !confirm(`Envoyer le devis de ${formatPrice(quote.totalCents)} au client ?`)) return;
    start(async () => {
      const res = await saveQuote(id, inputs, send);
      setMessage({ ok: res.status !== "error", text: res.message ?? "" });
    });
  }

  const ready = inputs.grams > 0 || inputs.hours > 0;
  const marginPct = quote.totalCents > 0 ? Math.round(((quote.piecesCents - quote.discountCents - quote.costCents) / Math.max(1, quote.piecesCents - quote.discountCents)) * 100) : 0;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      {/* Saisie */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-3">
          <label htmlFor="q-label" className={label}>Désignation (visible par le client)</label>
          <input id="q-label" value={inputs.label} onChange={(e) => set("label", e.target.value)} placeholder="Clip de garniture" className={field} />
        </div>
        <div>
          <label htmlFor="q-material" className={label}>Matériau</label>
          <select id="q-material" value={inputs.material} onChange={(e) => set("material", e.target.value as QuoteInputs["material"])} className={field}>
            {quoteMaterials.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="q-qty" className={label}>Quantité</label>
          <input id="q-qty" inputMode="numeric" value={text.quantity} onChange={(e) => setNum("quantity", e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="q-grams" className={label}>Filament / pièce (g)</label>
          <input id="q-grams" inputMode="decimal" value={text.grams} placeholder="0" onChange={(e) => setNum("grams", e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="q-hours" className={label}>Impression / pièce (h)</label>
          <input id="q-hours" inputMode="decimal" value={text.hours} placeholder="0" onChange={(e) => setNum("hours", e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="q-finish" className={label}>Finition totale (min)</label>
          <input id="q-finish" inputMode="numeric" value={text.finishingMinutes} placeholder="0" onChange={(e) => setNum("finishingMinutes", e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="q-discount" className={label}>Remise (%)</label>
          <input id="q-discount" inputMode="decimal" value={text.discountPct} placeholder="0" onChange={(e) => setNum("discountPct", e.target.value)} className={field} />
        </div>
        <label className="col-span-2 flex cursor-pointer items-center gap-2 text-[13px] sm:col-span-3">
          <input type="checkbox" checked={inputs.delivery} onChange={(e) => set("delivery", e.target.checked)} className="accent-[var(--color-accent)]" />
          Livraison ({formatPrice(tariffs.shippingCents)})
        </label>
        <p className="col-span-2 text-[11.5px] text-muted sm:col-span-3">
          Grammes et heures : ceux affichés par Bambu Studio après le découpage. Tarifs modifiables dans{" "}
          <Link href="/admin/parametres" className="text-fg/80 underline decoration-line-strong underline-offset-2 hover:text-accent">
            Paramètres
          </Link>
          .
        </p>
      </div>

      {/* Résultat */}
      <div className="rounded-md border border-line bg-bg/50 p-3">
        <p className="text-[11.5px] text-muted">Coût de revient</p>
        <dl className="mt-1.5 space-y-1 text-[12.5px]">
          {[
            ["Filament", quote.materialCents],
            ["Machine", quote.machineCents],
            ["Main-d'œuvre", quote.laborCents],
          ].map(([k, v]) => (
            <div key={k as string} className="flex justify-between">
              <dt className="text-muted">{k}</dt>
              <dd className="font-mono">{formatPrice(v as number)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-1">
            <dt className="text-muted">Total coûts</dt>
            <dd className="font-mono">{formatPrice(quote.costCents)}</dd>
          </div>
        </dl>

        <p className="mt-3 text-[11.5px] text-muted">Pour le client</p>
        <ul className="mt-1.5 space-y-1 text-[12.5px]">
          {quote.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="min-w-0 truncate">
                {l.qty > 1 && `${l.qty} × `}
                {l.label}
              </span>
              <span className="shrink-0 font-mono">{formatPrice(l.unit_cents * l.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2">
          <span className="text-[13px] font-medium">Total</span>
          <span className="font-mono text-lg">{formatPrice(quote.totalCents)}</span>
        </div>
        <p className="mt-1 text-[11.5px] text-muted">
          Marge réelle : <span className={marginPct < 20 ? "text-amber-300" : "text-accent"}>{marginPct} %</span>
          {quote.minimumApplied && " · minimum de commande appliqué"}
        </p>

        <div className="mt-3 grid gap-1.5">
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={pending || !ready}
            className="rounded-md border border-line-strong px-3 py-1.5 text-[12.5px] transition hover:bg-fg/5 disabled:opacity-50"
          >
            Enregistrer le devis
          </button>
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={pending || !ready}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-medium text-on-accent transition hover:brightness-110 disabled:opacity-50"
          >
            {pending ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Send size={13} aria-hidden />}
            {status === "reçue" ? "Envoyer le devis au client" : "Enregistrer et passer en « Devis envoyé »"}
          </button>
        </div>
        {!ready && <p className="mt-2 text-[11.5px] text-muted">Indiquez au moins les grammes ou les heures.</p>}
        {message?.text && (
          <p role="status" className={`mt-2 text-[12px] ${message.ok ? "text-accent" : "text-red-300"}`}>
            {message.text}
          </p>
        )}
        {savedLines && savedLines.length > 0 && !message && (
          <p className="mt-2 text-[11.5px] text-muted">Un devis est déjà enregistré pour cette commande.</p>
        )}
      </div>
    </div>
  );
}
