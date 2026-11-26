"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { CalendarClock, LoaderCircle, Plus, Repeat, Trash2 } from "lucide-react";
import { deleteRecurring, generateOrder, saveRecurring, toggleRecurring, type RecurringState } from "./actions";
import { formatPrice } from "@/lib/site";

export type Recurring = {
  id: string;
  customer_name: string | null;
  customer_email: string;
  customer_company: string | null;
  title: string;
  lines: { label: string; qty: number; unit_cents: number }[];
  every_months: number;
  next_on: string;
  active: boolean;
  notes: string | null;
};

const field = "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";

export default function RecurringView({ list, today, pros }: { list: Recurring[]; today: string; pros: { email: string; name: string | null; company: string | null }[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const [, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [state, action, pending] = useActionState<RecurringState, FormData>(async (prev, fd) => {
    const res = await saveRecurring(prev, fd);
    if (res.status === "success") ref.current?.reset();
    return res;
  }, { status: "idle" });

  const fillClient = (email: string) => {
    const c = pros.find((p) => p.email === email);
    if (!c || !ref.current) return;
    (ref.current.elements.namedItem("customer_name") as HTMLInputElement).value = c.name ?? "";
    (ref.current.elements.namedItem("customer_company") as HTMLInputElement).value = c.company ?? "";
  };

  return (
    <div className="space-y-4">
      <form ref={ref} action={action} className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-panel p-3 sm:grid-cols-4">
        <input name="customer_email" type="email" required list="pros" onChange={(e) => fillClient(e.target.value)} placeholder="Email du client" aria-label="Email du client" className={field} />
        <datalist id="pros">
          {pros.map((p) => (
            <option key={p.email} value={p.email}>
              {p.company ?? p.name}
            </option>
          ))}
        </datalist>
        <input name="customer_name" placeholder="Nom" aria-label="Nom" className={field} />
        <input name="customer_company" placeholder="Entreprise" aria-label="Entreprise" className={`${field} col-span-2 sm:col-span-2`} />
        <input name="title" required placeholder="Clips de garnissage noirs" aria-label="Pièce" className={`${field} col-span-2`} />
        <input name="qty" inputMode="numeric" defaultValue="1" aria-label="Quantité" className={`${field} font-mono`} />
        <input name="unit" required inputMode="decimal" placeholder="Prix unitaire €" aria-label="Prix unitaire" className={`${field} font-mono`} />
        <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
          Tous les
          <input name="every_months" inputMode="numeric" defaultValue="1" aria-label="Tous les combien de mois" className={`${field} w-14 font-mono`} />
          mois
        </label>
        <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
          À partir du
          <input name="next_on" type="date" defaultValue={today} required aria-label="Prochaine commande" className={field} />
        </label>
        <input name="notes" placeholder="Notes (couleur, livraison…)" aria-label="Notes" className={`${field} col-span-2 sm:col-span-1`} />
        <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-fg px-3 py-1.5 text-[12.5px] font-medium text-bg disabled:opacity-60">
          {pending ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Plus size={13} aria-hidden />} Ajouter
        </button>
        {state.message && <p className={`col-span-2 text-[12px] sm:col-span-4 ${state.status === "error" ? "text-red-300" : "text-accent"}`}>{state.message}</p>}
      </form>

      {msg && <p className="text-[12.5px] text-accent">{msg}</p>}

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-10 text-center text-[13px] text-muted">
          Aucune commande récurrente. Pratique pour un garage ou une boutique qui recommande la même pièce chaque mois.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
          {list.map((r) => {
            const total = r.lines.reduce((n, l) => n + l.qty * l.unit_cents, 0);
            const due = r.active && r.next_on <= today;
            return (
              <li key={r.id} className="group flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-[13px]">
                <Repeat size={14} className={r.active ? "text-accent" : "text-muted"} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{r.title}</span>
                  <span className="block text-[12px] text-muted">
                    {r.customer_company ?? r.customer_name ?? r.customer_email} · {r.lines[0]?.qty ?? 1} × {formatPrice(r.lines[0]?.unit_cents ?? 0)} · tous les {r.every_months} mois
                  </span>
                </span>
                <span className="font-mono">{formatPrice(total)}</span>
                <span className={`flex items-center gap-1 text-[12px] ${due ? "text-amber-300" : "text-muted"}`}>
                  <CalendarClock size={12} aria-hidden /> {new Date(`${r.next_on}T12:00:00`).toLocaleDateString("fr-FR")}
                </span>
                <button
                  type="button"
                  disabled={busy === r.id || !r.active}
                  onClick={() => {
                    setBusy(r.id);
                    start(async () => {
                      const res = await generateOrder(r.id);
                      setMsg(res.message ?? null);
                      setBusy(null);
                    });
                  }}
                  className={`rounded-md px-2.5 py-1 text-[12px] font-medium disabled:opacity-50 ${due ? "bg-accent text-on-accent" : "border border-line text-muted hover:text-fg"}`}
                >
                  {busy === r.id ? <LoaderCircle size={12} className="animate-spin" aria-hidden /> : "Créer la commande"}
                </button>
                <label className="inline-flex items-center gap-1 text-[12px] text-muted">
                  <input type="checkbox" checked={r.active} onChange={(e) => start(() => toggleRecurring(r.id, e.target.checked))} className="accent-[var(--color-accent)]" />
                  Active
                </label>
                <button type="button" onClick={() => confirm(`Supprimer « ${r.title} » ?`) && start(() => deleteRecurring(r.id))} aria-label={`Supprimer ${r.title}`} className="text-muted opacity-60 hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100">
                  <Trash2 size={13} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
