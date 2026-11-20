"use client";

import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, LoaderCircle, Minus, Plus, RefreshCw, Scale, Trash2, TrendingDown } from "lucide-react";
import {
  addConsumable,
  addSpool,
  adjustConsumable,
  adjustSpool,
  applyRealPrices,
  deleteConsumable,
  deleteSpool,
  refillSpool,
  weighSpool,
  type StockState,
} from "./actions";
import { quoteMaterials, type Tariffs } from "@/lib/pricing";
import { averagePricePerKg, consumableCategories, dailyUse, isLow, pricePerKg, type Consumable, type Spool, type StockMovement } from "@/lib/stock";
import { formatPrice } from "@/lib/site";

const field =
  "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";
const label = "mb-1 block text-[11.5px] text-muted";
const kg = (g: number) => (Math.abs(g) >= 1000 ? `${(g / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} kg` : `${Math.round(g)} g`);
const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const reasonLabel: Record<StockMovement["reason"], string> = {
  impression: "Impression",
  raté: "Raté",
  recharge: "Bobine neuve",
  ajustement: "Ajustement",
};

type Tab = "filament" | "consommables" | "historique";

export default function StockView({
  spools,
  movements,
  consumables,
  tariffs,
  nowIso,
  initialTab = "filament",
}: {
  spools: Spool[];
  movements: StockMovement[];
  consumables: Consumable[];
  tariffs: Tariffs;
  nowIso: string;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, setAdding] = useState(spools.length === 0);

  function run(fn: () => Promise<StockState>) {
    start(async () => {
      const res = await fn();
      setMessage(res.message || res.status === "error" ? { ok: res.status !== "error", text: res.message ?? "" } : null);
    });
  }

  // Résumé par matériau : stock, consommation des 30 derniers jours, jours restants, prix réel.
  const summary = useMemo(() => {
    const use = dailyUse(movements, spools, new Date(nowIso));
    const avg = averagePricePerKg(spools);
    const byMat = new Map<string, number>();
    for (const s of spools) byMat.set(s.material, (byMat.get(s.material) ?? 0) + Number(s.grams_left));
    return [...byMat].map(([material, grams]) => {
      const perDay = use.get(material) ?? 0;
      return {
        material,
        grams,
        perDay,
        days: perDay > 0 ? Math.floor(grams / perDay) : null,
        real: avg.get(material) ?? null,
        tariff: tariffs.materials[material as keyof Tariffs["materials"]] ?? null,
      };
    });
  }, [spools, movements, tariffs, nowIso]);

  const stockValue = spools.reduce((n, s) => n + (s.price_cents != null ? Math.round((s.price_cents * Number(s.grams_left)) / s.spool_grams) : 0), 0);
  const lowSpools = spools.filter(isLow);
  const lowConsumables = consumables.filter((c) => Number(c.quantity) <= Number(c.alert_quantity));
  const priceGap = summary.some((s) => s.real !== null && s.tariff !== null && Math.abs(s.real - s.tariff) >= 100);

  return (
    <div className="space-y-4">
      {/* À racheter */}
      {(lowSpools.length > 0 || lowConsumables.length > 0) && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-400/30 bg-amber-400/[0.07] px-3.5 py-2.5 text-[13px]">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />
          <p>
            <span className="font-medium">À racheter : </span>
            {[
              ...lowSpools.map((s) => `${s.material} ${s.color} (${kg(Number(s.grams_left))})`),
              ...lowConsumables.map((c) => `${c.name} (${Number(c.quantity)} ${c.unit})`),
            ].join(", ")}
          </p>
        </div>
      )}

      {/* Résumé par matériau */}
      {summary.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {summary.map((s) => (
            <div key={s.material} className="rounded-lg border border-line bg-panel px-3 py-2.5">
              <p className="text-[11.5px] text-muted">{s.material}</p>
              <p className="mt-0.5 font-mono text-[17px]">{kg(s.grams)}</p>
              <p className={`mt-0.5 text-[11px] ${s.days !== null && s.days < 14 ? "text-amber-300" : "text-muted"}`}>
                {s.days !== null ? (
                  <>
                    <TrendingDown size={10} className="mr-0.5 inline" aria-hidden />~{s.days} j · {Math.round(s.perDay)} g/j
                  </>
                ) : (
                  "Pas encore de conso."
                )}
              </p>
              {s.real !== null && <p className="text-[11px] text-muted">Payé {formatPrice(s.real)}/kg</p>}
            </div>
          ))}
          <div className="rounded-lg border border-line bg-panel px-3 py-2.5">
            <p className="text-[11.5px] text-muted">Valeur du stock</p>
            <p className="mt-0.5 font-mono text-[17px]">{formatPrice(stockValue)}</p>
            <p className="mt-0.5 text-[11px] text-muted">bobines avec prix</p>
          </div>
        </div>
      )}

      {priceGap && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel px-3.5 py-2.5 text-[12.5px]">
          <span className="text-muted">Le prix réellement payé pour votre filament diffère des Tarifs utilisés pour les devis.</span>
          <button
            type="button"
            onClick={() => run(applyRealPrices)}
            className="ml-auto rounded-md border border-line-strong px-2.5 py-1 text-[12px] transition hover:bg-fg/5"
          >
            Utiliser les prix réels dans les devis
          </button>
        </div>
      )}

      {/* Onglets */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-line bg-panel p-0.5 text-[12.5px]" role="tablist">
          {(
            [
              ["filament", `Filament (${spools.length})`],
              ["consommables", `Consommables (${consumables.length})`],
              ["historique", "Historique"],
            ] as const
          ).map(([t, l]) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded px-2.5 py-1 transition ${tab === t ? "bg-fg/10 text-fg" : "text-muted hover:text-fg"}`}
            >
              {l}
            </button>
          ))}
        </div>
        {tab !== "historique" && (
          <button
            type="button"
            onClick={() => setAdding((a) => !a)}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-medium text-on-accent transition hover:brightness-110"
          >
            <Plus size={14} aria-hidden /> {tab === "filament" ? "Bobine" : "Consommable"}
          </button>
        )}
        {pending && <LoaderCircle size={14} className="animate-spin text-muted" aria-hidden />}
        {message?.text && (
          <p role="status" className={`text-[12.5px] ${message.ok ? "text-accent" : "text-red-300"}`}>
            {message.text}
          </p>
        )}
      </div>

      {tab === "filament" && (
        <>
          {adding && <AddSpoolForm onDone={() => setAdding(false)} />}
          {spools.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line-strong px-4 py-10 text-center text-[13px] text-muted">Aucune bobine. Ajoutez votre stock ci-dessus.</p>
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {spools.map((s) => (
                <SpoolCard key={s.id} spool={s} run={run} />
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "consommables" && (
        <>
          {adding && <AddConsumableForm onDone={() => setAdding(false)} />}
          {consumables.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line-strong px-4 py-10 text-center text-[13px] text-muted">
              Aucun consommable. Buses, plaques, colle, cartons, papier de soie…
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead className="border-b border-line bg-panel text-[11.5px] text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Consommable</th>
                    <th className="px-3 py-2 font-medium">Catégorie</th>
                    <th className="px-3 py-2 font-medium">Quantité</th>
                    <th className="px-3 py-2 font-medium">Alerte</th>
                    <th className="px-3 py-2 text-right font-medium">Prix</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {consumables.map((c) => {
                    const low = Number(c.quantity) <= Number(c.alert_quantity);
                    return (
                      <tr key={c.id}>
                        <td className="px-3 py-2 font-medium">{c.name}</td>
                        <td className="px-3 py-2 text-muted">{c.category}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => run(() => adjustConsumable(c.id, -1))} aria-label={`Retirer 1 ${c.name}`} className="rounded border border-line p-0.5 text-muted hover:text-fg">
                              <Minus size={12} aria-hidden />
                            </button>
                            <span className={`min-w-14 text-center font-mono ${low ? "text-amber-300" : ""}`}>
                              {Number(c.quantity)} {c.unit}
                            </span>
                            <button type="button" onClick={() => run(() => adjustConsumable(c.id, 1))} aria-label={`Ajouter 1 ${c.name}`} className="rounded border border-line p-0.5 text-muted hover:text-fg">
                              <Plus size={12} aria-hidden />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-[12px] text-muted">≤ {Number(c.alert_quantity)}</td>
                        <td className="px-3 py-2 text-right font-mono text-[12px] text-muted">{c.price_cents != null ? formatPrice(c.price_cents) : "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => confirm(`Supprimer « ${c.name} » ?`) && run(() => deleteConsumable(c.id))} aria-label={`Supprimer ${c.name}`} className="p-1 text-muted hover:text-red-300">
                            <Trash2 size={13} aria-hidden />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "historique" && (
        <div className="rounded-lg border border-line bg-panel">
          {movements.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-muted">
              Aucun mouvement. Le filament utilisé par les impressions terminées de l&apos;atelier apparaîtra ici.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {movements.slice(0, 100).map((m) => {
                const s = spools.find((x) => x.id === m.spool_id);
                return (
                  <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2 text-[13px]">
                    <span className="w-28 shrink-0 font-mono text-[11.5px] text-muted">{dateFmt.format(new Date(m.created_at))}</span>
                    <span className="size-3 shrink-0 rounded-full border border-line-strong" style={{ background: s?.color_hex ?? "transparent" }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{s ? `${s.material} ${s.color}` : "Bobine supprimée"}</span>
                    <span className="text-[12px] text-muted">{reasonLabel[m.reason]}</span>
                    <span className={`w-20 text-right font-mono ${m.grams < 0 ? "text-fg/90" : "text-accent"}`}>
                      {m.grams > 0 ? "+" : "−"}
                      {kg(Math.abs(Number(m.grams)))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SpoolCard({ spool: s, run }: { spool: Spool; run: (fn: () => Promise<StockState>) => void }) {
  const [mode, setMode] = useState<"use" | "weigh" | null>(null);
  const [value, setValue] = useState("");
  const pct = Math.round((Number(s.grams_left) / s.spool_grams) * 100);
  const low = isLow(s);
  const perKg = pricePerKg(s);

  function submit() {
    const n = Number(value.replace(",", "."));
    if (!Number.isFinite(n) || value === "") return;
    run(() => (mode === "use" ? adjustSpool(s.id, -Math.abs(n)) : weighSpool(s.id, n)));
    setMode(null);
    setValue("");
  }

  return (
    <li className={`rounded-lg border bg-panel p-3 ${low ? "border-amber-400/40" : "border-line"}`}>
      <div className="flex items-start gap-2.5">
        <span className="size-8 shrink-0 rounded-full border border-line-strong" style={{ background: s.color_hex }} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium">
            {s.material} · {s.color}
          </p>
          <p className="truncate text-[11.5px] text-muted">
            {[s.brand, perKg !== null ? `${formatPrice(perKg)}/kg` : null].filter(Boolean).join(" · ") || "Prix non renseigné"}
          </p>
        </div>
        {low && <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10.5px] text-amber-300">Bas</span>}
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-fg/10">
        <div className={`h-full rounded-full ${low ? "bg-amber-400" : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 flex justify-between font-mono text-[11px] text-muted">
        <span>
          {kg(Number(s.grams_left))} / {kg(s.spool_grams)}
        </span>
        <span>{pct} %</span>
      </p>

      {mode ? (
        <div className="mt-2 flex gap-1.5">
          <input
            autoFocus
            value={value}
            onChange={(e) => /^\d*[.,]?\d*$/.test(e.target.value) && setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            inputMode="decimal"
            placeholder={mode === "use" ? "Grammes utilisés" : "Poids restant (g)"}
            aria-label={mode === "use" ? "Grammes utilisés" : "Poids restant en grammes"}
            className={`${field} py-1`}
          />
          <button type="button" onClick={submit} className="rounded-md bg-fg px-2.5 text-[12px] font-medium text-bg">
            OK
          </button>
          <button type="button" onClick={() => setMode(null)} className="px-1.5 text-[12px] text-muted hover:text-fg">
            ✕
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1">
          <button type="button" onClick={() => setMode("use")} className="inline-flex items-center gap-1 rounded border border-line px-2 py-0.5 text-[11.5px] text-muted hover:text-fg">
            <Minus size={11} aria-hidden /> Utilisé
          </button>
          <button type="button" onClick={() => setMode("weigh")} className="inline-flex items-center gap-1 rounded border border-line px-2 py-0.5 text-[11.5px] text-muted hover:text-fg">
            <Scale size={11} aria-hidden /> Pesée
          </button>
          <button
            type="button"
            onClick={() => confirm(`Bobine ${s.material} ${s.color} remplacée par une neuve (${kg(s.spool_grams)}) ?`) && run(() => refillSpool(s.id))}
            className="inline-flex items-center gap-1 rounded border border-line px-2 py-0.5 text-[11.5px] text-muted hover:text-fg"
          >
            <RefreshCw size={11} aria-hidden /> Neuve
          </button>
          <button
            type="button"
            onClick={() => confirm(`Supprimer la bobine ${s.material} ${s.color} ?`) && run(() => deleteSpool(s.id))}
            aria-label="Supprimer la bobine"
            className="ml-auto p-1 text-muted hover:text-red-300"
          >
            <Trash2 size={13} aria-hidden />
          </button>
        </div>
      )}
    </li>
  );
}

function AddSpoolForm({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<StockState, FormData>(async (prev, fd) => {
    const res = await addSpool(prev, fd);
    if (res.status === "success") {
      ref.current?.reset();
      onDone();
    }
    return res;
  }, { status: "idle" });
  return (
    <form ref={ref} action={action} className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-panel p-4 sm:grid-cols-4 lg:grid-cols-[100px_1fr_60px_1fr_100px_100px_100px_70px_auto] lg:items-end">
      <div>
        <label htmlFor="s-material" className={label}>Matériau</label>
        <select id="s-material" name="material" defaultValue="PLA" className={field}>
          {quoteMaterials.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="s-color" className={label}>Couleur</label>
        <input id="s-color" name="color" required maxLength={40} placeholder="Noir mat" className={field} />
      </div>
      <div>
        <label htmlFor="s-hex" className={label}>Teinte</label>
        <input id="s-hex" name="color_hex" type="color" defaultValue="#1d1d1f" className="h-[34px] w-full cursor-pointer rounded-md border border-line bg-bg/60 p-1" />
      </div>
      <div>
        <label htmlFor="s-brand" className={label}>Marque</label>
        <input id="s-brand" name="brand" maxLength={40} placeholder="Bambu Lab" className={field} />
      </div>
      <div>
        <label htmlFor="s-grams" className={label}>Bobine (g)</label>
        <input id="s-grams" name="spool_grams" inputMode="numeric" defaultValue="1000" className={field} />
      </div>
      <div>
        <label htmlFor="s-price" className={label}>Prix payé (€)</label>
        <input id="s-price" name="price" inputMode="decimal" placeholder="19,99" className={field} />
      </div>
      <div>
        <label htmlFor="s-alert" className={label}>Alerte sous (g)</label>
        <input id="s-alert" name="alert_grams" inputMode="numeric" defaultValue="200" className={field} />
      </div>
      <div>
        <label htmlFor="s-count" className={label}>Nombre</label>
        <input id="s-count" name="count" inputMode="numeric" defaultValue="1" className={field} />
      </div>
      <button type="submit" disabled={pending} className="col-span-2 inline-flex h-[34px] items-center justify-center gap-1.5 rounded-md bg-fg px-3 text-[12.5px] font-medium text-bg disabled:opacity-60 sm:col-span-4 lg:col-span-1">
        {pending ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Plus size={13} aria-hidden />}
        Ajouter
      </button>
      {state.status === "error" && <p className="col-span-2 text-[12px] text-red-300 sm:col-span-4 lg:col-span-9">{state.message}</p>}
    </form>
  );
}

function AddConsumableForm({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<StockState, FormData>(async (prev, fd) => {
    const res = await addConsumable(prev, fd);
    if (res.status === "success") {
      ref.current?.reset();
      onDone();
    }
    return res;
  }, { status: "idle" });
  return (
    <form ref={ref} action={action} className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-panel p-4 sm:grid-cols-3 lg:grid-cols-[1fr_140px_90px_90px_90px_100px_auto] lg:items-end">
      <div className="col-span-2 sm:col-span-3 lg:col-span-1">
        <label htmlFor="c-name" className={label}>Consommable</label>
        <input id="c-name" name="name" required maxLength={60} placeholder="Buse 0,4 mm acier trempé" className={field} />
      </div>
      <div>
        <label htmlFor="c-cat" className={label}>Catégorie</label>
        <select id="c-cat" name="category" defaultValue="Atelier" className={field}>
          {consumableCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="c-qty" className={label}>Quantité</label>
        <input id="c-qty" name="quantity" inputMode="decimal" defaultValue="1" className={field} />
      </div>
      <div>
        <label htmlFor="c-unit" className={label}>Unité</label>
        <input id="c-unit" name="unit" maxLength={20} defaultValue="pièce" className={field} />
      </div>
      <div>
        <label htmlFor="c-alert" className={label}>Alerte ≤</label>
        <input id="c-alert" name="alert" inputMode="decimal" defaultValue="1" className={field} />
      </div>
      <div>
        <label htmlFor="c-price" className={label}>Prix (€)</label>
        <input id="c-price" name="price" inputMode="decimal" placeholder="—" className={field} />
      </div>
      <button type="submit" disabled={pending} className="col-span-2 inline-flex h-[34px] items-center justify-center gap-1.5 rounded-md bg-fg px-3 text-[12.5px] font-medium text-bg disabled:opacity-60 sm:col-span-3 lg:col-span-1">
        {pending ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Plus size={13} aria-hidden />}
        Ajouter
      </button>
      {state.status === "error" && <p className="col-span-2 text-[12px] text-red-300 sm:col-span-3 lg:col-span-7">{state.message}</p>}
    </form>
  );
}
