"use client";

import { useActionState, useRef, useTransition } from "react";
import { Gift, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { deletePromo, savePromo, togglePromo, type PromoState } from "./actions";
import { formatPrice } from "@/lib/site";

export type Promo = {
  code: string;
  kind: "pourcent" | "montant";
  value: number;
  min_cents: number;
  max_uses: number | null;
  uses: number;
  expires_on: string | null;
  active: boolean;
  owner_email: string | null;
  reward_for: string | null;
  note: string | null;
};

const field = "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";
const label = (p: Promo) => (p.kind === "pourcent" ? `−${p.value} %` : `−${formatPrice(p.value)}`);
const expired = (p: Promo) => Boolean(p.expires_on && p.expires_on < new Date().toISOString().slice(0, 10));

function Row({ p }: { p: Promo }) {
  const [, start] = useTransition();
  const used = p.max_uses !== null && p.uses >= p.max_uses;
  return (
    <li className="group flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
      <span className="font-mono font-medium">{p.code}</span>
      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[11.5px] text-accent">{label(p)}</span>
      <span className="min-w-0 flex-1 truncate text-[12px] text-muted">
        {p.owner_email && `Parrain : ${p.owner_email} · `}
        {p.reward_for && `Récompense (filleul ${p.reward_for}) · `}
        {p.min_cents > 0 && `dès ${formatPrice(p.min_cents)} · `}
        {p.uses} utilisation{p.uses > 1 ? "s" : ""}
        {p.max_uses !== null && ` / ${p.max_uses}`}
        {p.expires_on && ` · jusqu'au ${new Date(`${p.expires_on}T12:00:00`).toLocaleDateString("fr-FR")}`}
        {p.note && ` · ${p.note}`}
      </span>
      {(expired(p) || used) && <span className="text-[11.5px] text-amber-300">{expired(p) ? "Expiré" : "Épuisé"}</span>}
      <label className="inline-flex items-center gap-1.5 text-[12px] text-muted">
        <input type="checkbox" checked={p.active} onChange={(e) => start(() => togglePromo(p.code, e.target.checked))} className="accent-[var(--color-accent)]" />
        Actif
      </label>
      <button type="button" onClick={() => confirm(`Supprimer le code ${p.code} ?`) && start(() => deletePromo(p.code))} aria-label={`Supprimer ${p.code}`} className="text-muted opacity-60 hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100">
        <Trash2 size={13} aria-hidden />
      </button>
    </li>
  );
}

export default function PromosView({ shop, referral }: { shop: Promo[]; referral: Promo[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<PromoState, FormData>(async (prev, fd) => {
    const res = await savePromo(prev, fd);
    if (res.status === "success") ref.current?.reset();
    return res;
  }, { status: "idle" });

  return (
    <div className="space-y-4">
      <form ref={ref} action={action} className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-panel p-3 sm:grid-cols-[150px_120px_100px_110px_90px_140px]">
        <input name="code" required placeholder="NOEL10" aria-label="Code" className={`${field} font-mono uppercase`} />
        <select name="kind" aria-label="Type" className={field}>
          <option value="pourcent">Pourcentage</option>
          <option value="montant">Montant (€)</option>
        </select>
        <input name="value" required inputMode="decimal" placeholder="10" aria-label="Réduction" className={`${field} font-mono`} />
        <input name="min" inputMode="decimal" placeholder="Dès 0 €" aria-label="Panier minimum (€)" className={`${field} font-mono`} />
        <input name="max_uses" inputMode="numeric" placeholder="Illimité" aria-label="Utilisations max" className={`${field} font-mono`} />
        <input name="expires_on" type="date" aria-label="Expire le" className={field} />
        <input name="note" placeholder="Note interne (ex. concours Instagram)" aria-label="Note" className={`${field} col-span-2 sm:col-span-5`} />
        <button type="submit" disabled={pending} className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-md bg-fg px-3 py-1.5 text-[12.5px] font-medium text-bg disabled:opacity-60 sm:col-span-1">
          {pending ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Plus size={13} aria-hidden />} Créer
        </button>
        {state.message && <p className={`col-span-2 text-[12px] sm:col-span-6 ${state.status === "error" ? "text-red-300" : "text-accent"}`}>{state.message}</p>}
      </form>

      <section className="rounded-lg border border-line bg-panel">
        <h2 className="border-b border-line px-4 py-2.5 text-[13px] font-medium">Codes de la boutique</h2>
        {shop.length ? <ul className="divide-y divide-line">{shop.map((p) => <Row key={p.code} p={p} />)}</ul> : <p className="px-4 py-6 text-[13px] text-muted">Aucun code pour l&apos;instant.</p>}
      </section>

      <section className="rounded-lg border border-line bg-panel">
        <h2 className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-[13px] font-medium">
          <Gift size={14} className="text-muted" aria-hidden /> Parrainage
        </h2>
        <p className="px-4 pt-3 text-[12px] text-muted">
          Chaque client avec un compte a son code (−10 % pour un ami sur sa première commande). Quand l&apos;ami paie, le parrain reçoit un bon de 5 € par email.
        </p>
        {referral.length ? <ul className="divide-y divide-line">{referral.map((p) => <Row key={p.code} p={p} />)}</ul> : <p className="px-4 py-6 text-[13px] text-muted">Aucun parrainage pour l&apos;instant.</p>}
      </section>
    </div>
  );
}
