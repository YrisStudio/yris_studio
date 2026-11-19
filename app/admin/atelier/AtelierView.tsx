"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CircleSlash,
  LoaderCircle,
  Play,
  Plus,
  Printer as PrinterIcon,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import {
  addJob,
  addPrinter,
  assignJob,
  deleteJob,
  deletePrinter,
  failJob,
  finishJob,
  markMaintenance,
  moveJob,
  setPrinterStatus,
  startJob,
  type AtelierState,
} from "./actions";
import { formatHours, hoursUntilMaintenance, planPrinter, printerModels, progress, type PrintJob, type Printer } from "@/lib/atelier";
import { quoteMaterials, type Tariffs } from "@/lib/pricing";
import { formatPrice, orderRef } from "@/lib/site";

const field =
  "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";
const label = "mb-1 block text-[11.5px] text-muted";
const time = new Intl.DateTimeFormat("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

const statusPill: Record<Printer["status"], string> = {
  active: "bg-accent/15 text-accent",
  maintenance: "bg-amber-400/15 text-amber-300",
  "hors service": "bg-red-400/15 text-red-300",
};

export default function AtelierView({
  printers,
  jobs,
  history,
  materialPrices,
  nowIso,
}: {
  printers: Printer[];
  jobs: PrintJob[];
  history: PrintJob[];
  materialPrices: Tariffs["materials"];
  nowIso: string;
}) {
  // L'heure avance toute seule : avancement et planning se mettent à jour chaque minute.
  const [now, setNow] = useState(() => new Date(nowIso));
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [panel, setPanel] = useState<"job" | "printer" | null>(printers.length === 0 ? "printer" : null);
  const [failing, setFailing] = useState<string | null>(null);

  function run(fn: () => Promise<AtelierState>) {
    start(async () => {
      const res = await fn();
      if (res.message || res.status === "error") setMessage({ ok: res.status !== "error", text: res.message ?? "" });
      else setMessage(null);
    });
  }

  const byPrinter = useMemo(() => {
    const map = new Map<string | null, PrintJob[]>();
    for (const p of printers) map.set(p.id, []);
    map.set(null, []);
    for (const j of jobs) (map.get(j.printer_id) ?? map.get(null)!).push(j);
    return map;
  }, [printers, jobs]);

  const plans = useMemo(() => {
    const m = new Map<string, { start: Date; end: Date }>();
    for (const [, list] of byPrinter) for (const [id, slot] of planPrinter(list, now)) m.set(id, slot);
    return m;
  }, [byPrinter, now]);

  const unassigned = byPrinter.get(null) ?? [];
  const failures = history.filter((j) => j.status === "raté");
  const done = history.filter((j) => j.status === "terminé");
  const lostGrams = failures.reduce((n, j) => n + Number(j.grams_lost ?? 0), 0);
  const lostCents = failures.reduce(
    (n, j) => n + Math.round((Number(j.grams_lost ?? 0) / 1000) * (materialPrices[(j.material ?? "PLA") as keyof Tariffs["materials"]] ?? materialPrices.PLA)),
    0,
  );
  const successRate = history.length ? Math.round((done.length / history.length) * 100) : null;

  const columns: { id: string | null; title: string; printer?: Printer; list: PrintJob[] }[] = [
    ...printers.map((p) => ({ id: p.id, title: p.name, printer: p, list: byPrinter.get(p.id) ?? [] })),
    ...(unassigned.length || printers.length === 0 ? [{ id: null, title: "Non assignées", list: unassigned }] : []),
  ];

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPanel(panel === "job" ? null : "job")}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-medium text-on-accent transition hover:brightness-110"
        >
          <Plus size={14} aria-hidden /> Impression
        </button>
        <button
          type="button"
          onClick={() => setPanel(panel === "printer" ? null : "printer")}
          className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-[12.5px] transition hover:bg-fg/5"
        >
          <PrinterIcon size={14} aria-hidden /> Imprimante
        </button>
        {pending && <LoaderCircle size={14} className="animate-spin text-muted" aria-hidden />}
        {message?.text && (
          <p role="status" className={`text-[12.5px] ${message.ok ? "text-accent" : "text-red-300"}`}>
            {message.text}
          </p>
        )}
      </div>

      {panel === "printer" && <AddPrinterForm onDone={() => setPanel(null)} />}
      {panel === "job" && <AddJobForm printers={printers} onDone={() => setPanel(null)} />}

      {/* Imprimantes */}
      {printers.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {printers.map((p) => {
            const list = byPrinter.get(p.id) ?? [];
            const running = list.find((j) => j.status === "en cours");
            const queue = list.filter((j) => j.status === "à faire");
            const last = [...plans.entries()].filter(([id]) => list.some((j) => j.id === id)).map(([, s]) => s.end).sort((a, b) => b.getTime() - a.getTime())[0];
            const left = hoursUntilMaintenance(p);
            const wear = Math.min(1, Math.max(0, 1 - left / p.maintenance_every_hours));
            const pct = running ? progress(running, now) : 0;
            return (
              <article key={p.id} className="rounded-lg border border-line bg-panel p-3.5">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{p.name}</p>
                    <p className="truncate text-[11.5px] text-muted">{p.model}</p>
                  </div>
                  <select
                    value={p.status}
                    onChange={(e) => run(() => setPrinterStatus(p.id, e.target.value as Printer["status"]))}
                    aria-label={`État de ${p.name}`}
                    className={`rounded px-1.5 py-0.5 text-[11.5px] outline-none ${statusPill[p.status]}`}
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="hors service">Hors service</option>
                  </select>
                </div>

                <div className="mt-3 rounded-md border border-line bg-bg/50 p-2.5">
                  {running ? (
                    <>
                      <p className="truncate text-[12.5px]">
                        <span className="text-accent">● </span>
                        {running.title}
                      </p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fg/10">
                        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.round(pct * 100)}%` }} />
                      </div>
                      <p className="mt-1.5 flex justify-between font-mono text-[11px] text-muted">
                        <span>{Math.round(pct * 100)} %</span>
                        <span>fin ~ {time.format(plans.get(running.id)?.end ?? now)}</span>
                      </p>
                    </>
                  ) : (
                    <p className="text-[12.5px] text-muted">{p.status === "active" ? "Libre" : "À l'arrêt"}</p>
                  )}
                </div>

                <p className="mt-2.5 text-[11.5px] text-muted">
                  {queue.length} en attente
                  {queue.length > 0 && ` · ${formatHours(queue.reduce((n, j) => n + Number(j.hours) * j.quantity, 0))}`}
                  {last && ` · file vide ~ ${time.format(last)}`}
                </p>

                {/* Maintenance */}
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className={left <= 0 ? "text-red-300" : left < p.maintenance_every_hours * 0.15 ? "text-amber-300" : "text-muted"}>
                      <Wrench size={11} className="mr-1 inline" aria-hidden />
                      {left <= 0 ? `Maintenance en retard de ${formatHours(-left)}` : `Maintenance dans ${formatHours(left)}`}
                    </span>
                    <span className="font-mono text-muted">{formatHours(Number(p.hours_total))}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-fg/10">
                    <div
                      className={`h-full rounded-full ${wear >= 1 ? "bg-red-400" : wear > 0.85 ? "bg-amber-400" : "bg-fg/40"}`}
                      style={{ width: `${Math.round(wear * 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => confirm(`Maintenance faite sur ${p.name} ? Le compteur repart de zéro.`) && run(() => markMaintenance(p.id))}
                      className="rounded border border-line px-2 py-0.5 text-[11.5px] text-muted transition hover:border-line-strong hover:text-fg"
                    >
                      Maintenance faite
                    </button>
                    <button
                      type="button"
                      onClick={() => confirm(`Supprimer ${p.name} ? Ses impressions en attente repasseront « non assignées ».`) && run(() => deletePrinter(p.id))}
                      aria-label={`Supprimer ${p.name}`}
                      className="ml-auto rounded p-1 text-muted transition hover:text-red-300"
                    >
                      <Trash2 size={13} aria-hidden />
                    </button>
                  </div>
                  {p.last_maintenance_at && (
                    <p className="mt-1 text-[11px] text-muted/80">Dernière : {day.format(new Date(p.last_maintenance_at))}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* File d'impression et planning */}
      <section>
        <h2 className="mb-2 text-[13px] font-medium">File d&apos;impression</h2>
        {jobs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong px-4 py-10 text-center text-[13px] text-muted">
            Rien à imprimer. Ajoutez une impression, ou envoyez une commande depuis sa fiche.
          </p>
        ) : (
          <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:thin] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            {columns.map((c) => {
              const ordered = [...c.list].sort((a, b) => Number(b.status === "en cours") - Number(a.status === "en cours") || a.position - b.position);
              const busy = c.list.some((j) => j.status === "en cours");
              return (
                <div key={c.id ?? "none"} className="flex w-[85vw] max-w-[340px] shrink-0 snap-start flex-col rounded-lg border border-line bg-panel/60 sm:w-[300px] lg:w-auto lg:max-w-none lg:flex-1 lg:basis-0">
                  <header className="flex items-center gap-2 border-b border-line px-3 py-2">
                    <PrinterIcon size={13} className="text-muted" aria-hidden />
                    <h3 className="truncate text-[13px] font-medium">{c.title}</h3>
                    <span className="font-mono text-[11px] text-muted">{c.list.length}</span>
                  </header>
                  <ol className="flex flex-col gap-2 p-2">
                    {ordered.length === 0 && <li className="py-6 text-center text-[12px] text-muted/70">File vide</li>}
                    {ordered.map((j, i) => {
                      const slot = plans.get(j.id);
                      const isRunning = j.status === "en cours";
                      const queueIndex = ordered.filter((x) => x.status === "à faire").indexOf(j);
                      const queueLength = ordered.filter((x) => x.status === "à faire").length;
                      return (
                        <li key={j.id} className={`rounded-md border bg-panel-2 p-2.5 ${isRunning ? "border-accent/50" : "border-line"}`}>
                          <div className="flex items-start gap-2">
                            <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded font-mono text-[10px] ${isRunning ? "bg-accent text-on-accent" : "bg-fg/10 text-muted"}`}>
                              {isRunning ? "●" : i + 1 - (busy ? 1 : 0)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-medium leading-snug">{j.title}</p>
                              <p className="mt-0.5 text-[11.5px] text-muted">
                                {j.quantity > 1 && `× ${j.quantity} · `}
                                {[j.material, Number(j.grams) ? `${Math.round(Number(j.grams) * j.quantity)} g` : null, formatHours(Number(j.hours) * j.quantity)].filter(Boolean).join(" · ")}
                              </p>
                              {j.order_id && (
                                <Link href={`/admin/commandes/${j.order_id}`} className="font-mono text-[11px] text-muted hover:text-accent">
                                  Commande {orderRef(j.order_id)}
                                </Link>
                              )}
                              {slot && c.id && (
                                <p className="mt-1 font-mono text-[11px] text-fg/70">
                                  {isRunning ? `fin ~ ${time.format(slot.end)}` : `${time.format(slot.start)} → ${time.format(slot.end)}`}
                                </p>
                              )}
                              {isRunning && (
                                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-fg/10">
                                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(progress(j, now) * 100)}%` }} />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          {failing === j.id ? (
                            <FailForm
                              onCancel={() => setFailing(null)}
                              onSubmit={(reason, grams) => {
                                setFailing(null);
                                run(() => failJob(j.id, reason, grams));
                              }}
                            />
                          ) : (
                            <div className="mt-2 flex flex-wrap items-center gap-1">
                              {isRunning ? (
                                <>
                                  <button type="button" onClick={() => run(() => finishJob(j.id))} className="inline-flex items-center gap-1 rounded bg-accent px-2 py-1 text-[11.5px] font-medium text-on-accent">
                                    <Check size={12} aria-hidden /> Terminée
                                  </button>
                                  <button type="button" onClick={() => setFailing(j.id)} className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-[11.5px] text-muted hover:border-red-400/40 hover:text-red-300">
                                    <CircleSlash size={12} aria-hidden /> Ratée
                                  </button>
                                </>
                              ) : (
                                <>
                                  {c.id && !busy && queueIndex === 0 && (
                                    <button type="button" onClick={() => run(() => startJob(j.id))} className="inline-flex items-center gap-1 rounded bg-fg px-2 py-1 text-[11.5px] font-medium text-bg">
                                      <Play size={11} aria-hidden /> Lancer
                                    </button>
                                  )}
                                  <select
                                    value={j.printer_id ?? ""}
                                    onChange={(e) => run(() => assignJob(j.id, e.target.value || null))}
                                    aria-label="Imprimante"
                                    className="max-w-[130px] rounded border border-line bg-transparent px-1 py-0.5 text-[11.5px] text-muted outline-none"
                                  >
                                    <option value="">Non assignée</option>
                                    {printers.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="ml-auto flex">
                                    <button type="button" disabled={queueIndex <= 0} onClick={() => run(() => moveJob(j.id, -1))} aria-label="Monter" className="rounded p-1 text-muted hover:text-fg disabled:opacity-30">
                                      <ArrowUp size={13} aria-hidden />
                                    </button>
                                    <button type="button" disabled={queueIndex >= queueLength - 1} onClick={() => run(() => moveJob(j.id, 1))} aria-label="Descendre" className="rounded p-1 text-muted hover:text-fg disabled:opacity-30">
                                      <ArrowDown size={13} aria-hidden />
                                    </button>
                                    <button type="button" onClick={() => confirm(`Retirer « ${j.title} » de la file ?`) && run(() => deleteJob(j.id))} aria-label="Retirer" className="rounded p-1 text-muted hover:text-red-300">
                                      <X size={13} aria-hidden />
                                    </button>
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Journal des ratés */}
      <section className="rounded-lg border border-line bg-panel">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-[13px] font-medium">
            <AlertTriangle size={14} className="text-muted" aria-hidden /> Journal des ratés
          </h2>
          <span className="text-[11.5px] text-muted">
            {successRate !== null && `Réussite ${successRate} % sur les ${history.length} dernières · `}
            {Math.round(lostGrams)} g perdus · {formatPrice(lostCents)}
          </span>
        </header>
        {failures.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted">Aucun raté enregistré.</p>
        ) : (
          <ul className="divide-y divide-line">
            {failures.map((j) => (
              <li key={j.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2 text-[13px]">
                <span className="w-16 shrink-0 font-mono text-[11.5px] text-muted">{j.finished_at ? day.format(new Date(j.finished_at)) : ""}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{j.title}</span>
                <span className="text-muted">{j.failure_reason}</span>
                <span className="font-mono text-[11.5px] text-muted">
                  {j.grams_lost ? `${Math.round(Number(j.grams_lost))} g` : "—"} · {printers.find((p) => p.id === j.printer_id)?.name ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const failReasons = ["Décollement du plateau", "Spaghetti", "Bourrage / buse bouchée", "Fin de bobine", "Coupure de courant", "Erreur de réglage"];

function FailForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (reason: string, grams: number) => void }) {
  const [reason, setReason] = useState(failReasons[0]);
  const [grams, setGrams] = useState("");
  return (
    <div className="mt-2 space-y-1.5 rounded border border-red-400/30 bg-red-400/[0.06] p-2">
      <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Cause du raté" className={`${field} py-1`}>
        {failReasons.map((r) => (
          <option key={r}>{r}</option>
        ))}
        <option>Autre</option>
      </select>
      <input
        value={grams}
        onChange={(e) => /^\d*[.,]?\d*$/.test(e.target.value) && setGrams(e.target.value)}
        inputMode="decimal"
        placeholder="Filament perdu (g)"
        aria-label="Filament perdu en grammes"
        className={`${field} py-1`}
      />
      <div className="flex gap-1.5">
        <button type="button" onClick={() => onSubmit(reason, Number(grams.replace(",", ".")) || 0)} className="rounded bg-red-400/80 px-2 py-1 text-[11.5px] font-medium text-bg">
          Enregistrer le raté
        </button>
        <button type="button" onClick={onCancel} className="rounded px-2 py-1 text-[11.5px] text-muted hover:text-fg">
          Annuler
        </button>
      </div>
    </div>
  );
}

function AddPrinterForm({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<AtelierState, FormData>(async (prev, fd) => {
    const res = await addPrinter(prev, fd);
    if (res.status === "success") {
      ref.current?.reset();
      onDone();
    }
    return res;
  }, { status: "idle" });
  return (
    <form ref={ref} action={action} className="grid gap-3 rounded-lg border border-line bg-panel p-4 sm:grid-cols-[1fr_1fr_120px_140px_auto] sm:items-end">
      <div>
        <label htmlFor="p-name" className={label}>Nom</label>
        <input id="p-name" name="name" required maxLength={40} placeholder="P1S n°1" className={field} />
      </div>
      <div>
        <label htmlFor="p-model" className={label}>Modèle</label>
        <select id="p-model" name="model" defaultValue="Bambu Lab P1S" className={field}>
          {printerModels.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="p-hours" className={label}>Heures déjà faites</label>
        <input id="p-hours" name="hours" inputMode="decimal" placeholder="0" className={field} />
      </div>
      <div>
        <label htmlFor="p-every" className={label}>Maintenance toutes les</label>
        <div className="relative">
          <input id="p-every" name="every" inputMode="numeric" defaultValue="200" className={`${field} pr-7`} />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11.5px] text-muted">h</span>
        </div>
      </div>
      <button type="submit" disabled={pending} className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-md bg-fg px-3 text-[12.5px] font-medium text-bg disabled:opacity-60">
        {pending ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Plus size={13} aria-hidden />}
        Ajouter
      </button>
      {state.status === "error" && <p className="text-[12px] text-red-300 sm:col-span-5">{state.message}</p>}
    </form>
  );
}

function AddJobForm({ printers, onDone }: { printers: Printer[]; onDone: () => void }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<AtelierState, FormData>(async (prev, fd) => {
    const res = await addJob(prev, fd);
    if (res.status === "success") {
      ref.current?.reset();
      onDone();
    }
    return res;
  }, { status: "idle" });
  return (
    <form ref={ref} action={action} className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-panel p-4 sm:grid-cols-3 lg:grid-cols-[2fr_100px_90px_90px_80px_1fr_auto] lg:items-end">
      <div className="col-span-2 sm:col-span-3 lg:col-span-1">
        <label htmlFor="j-title" className={label}>À imprimer</label>
        <input id="j-title" name="title" required maxLength={120} placeholder="Support casque (stock boutique)" className={field} />
      </div>
      <div>
        <label htmlFor="j-material" className={label}>Matériau</label>
        <select id="j-material" name="material" defaultValue="PLA" className={field}>
          {quoteMaterials.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="j-grams" className={label}>Grammes</label>
        <input id="j-grams" name="grams" inputMode="decimal" placeholder="0" className={field} />
      </div>
      <div>
        <label htmlFor="j-hours" className={label}>Heures</label>
        <input id="j-hours" name="hours" inputMode="decimal" placeholder="2,5" required className={field} />
      </div>
      <div>
        <label htmlFor="j-qty" className={label}>Qté</label>
        <input id="j-qty" name="quantity" inputMode="numeric" defaultValue="1" className={field} />
      </div>
      <div>
        <label htmlFor="j-printer" className={label}>Imprimante</label>
        <select id="j-printer" name="printer" defaultValue={printers[0]?.id ?? ""} className={field}>
          <option value="">Non assignée</option>
          {printers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={pending} className="col-span-2 inline-flex h-[34px] items-center justify-center gap-1.5 rounded-md bg-fg px-3 text-[12.5px] font-medium text-bg disabled:opacity-60 sm:col-span-3 lg:col-span-1">
        {pending ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Plus size={13} aria-hidden />}
        Ajouter
      </button>
      {state.status === "error" && <p className="col-span-2 text-[12px] text-red-300 sm:col-span-3 lg:col-span-7">{state.message}</p>}
    </form>
  );
}
