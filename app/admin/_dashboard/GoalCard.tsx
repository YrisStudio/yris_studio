"use client";

import { useActionState, useState } from "react";
import { Pencil, Target } from "lucide-react";
import { setMonthlyGoal, type GoalState } from "../actions";
import { formatPrice } from "@/lib/site";

// Objectif du mois : avancement, projection de fin de mois au rythme actuel, et réglage de l'objectif.
export default function GoalCard({ goal, monthRevenue, projected, daysLeft }: { goal: number; monthRevenue: number; projected: number; daysLeft: number }) {
  const [editing, setEditing] = useState(goal === 0);
  const [state, action, pending] = useActionState<GoalState, FormData>(async (prev, fd) => {
    const res = await setMonthlyGoal(prev, fd);
    if (res.status === "success") setEditing(false);
    return res;
  }, { status: "idle" });

  const pct = goal > 0 ? Math.min(100, Math.round((monthRevenue / goal) * 100)) : 0;
  const projPct = goal > 0 ? Math.min(100, Math.round((projected / goal) * 100)) : 0;
  const month = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "Europe/Paris" }).format(new Date());
  const onTrack = goal > 0 && projected >= goal;

  return (
    <section className="rounded-lg border border-line bg-panel">
      <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <Target size={14} className="text-muted" aria-hidden />
        <h2 className="text-[13px] font-medium">Objectif de {month}</h2>
        {goal > 0 && !editing && (
          <button type="button" onClick={() => setEditing(true)} aria-label="Modifier l'objectif" className="ml-auto p-1 text-muted hover:text-fg">
            <Pencil size={13} aria-hidden />
          </button>
        )}
      </header>
      <div className="p-4">
        {goal > 0 && (
          <>
            <p className="font-mono text-[22px] leading-none">
              {formatPrice(monthRevenue)}
              <span className="text-[13px] text-muted"> / {formatPrice(goal)}</span>
            </p>
            {/* Barre : réalisé (plein) et projection (clair) */}
            <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-fg/10" role="img" aria-label={`${pct} % réalisé, ${projPct} % projeté`}>
              <div className="absolute inset-y-0 left-0 rounded-full bg-accent/25" style={{ width: `${projPct}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[11.5px]">
              <span className="font-mono">{pct} %</span>
              <span className="text-muted">{daysLeft} jour(s) restant(s)</span>
            </div>
            <p className={`mt-2.5 text-[12.5px] ${monthRevenue >= goal ? "text-accent" : onTrack ? "text-fg/85" : "text-amber-300"}`}>
              {monthRevenue >= goal
                ? "Objectif atteint, bravo !"
                : onTrack
                  ? `Au rythme actuel : ~${formatPrice(projected)} en fin de mois. C'est dans la poche.`
                  : `Au rythme actuel : ~${formatPrice(projected)}. Il manque ${formatPrice(goal - monthRevenue)}.`}
            </p>
          </>
        )}
        {editing && (
          <form action={action} className={`flex items-center gap-2 ${goal > 0 ? "mt-3 border-t border-line pt-3" : ""}`}>
            <label htmlFor="goal" className="sr-only">Objectif du mois en euros</label>
            <div className="relative flex-1">
              <input
                id="goal"
                name="goal"
                inputMode="decimal"
                defaultValue={goal > 0 ? String(goal / 100).replace(".", ",") : ""}
                placeholder="Objectif du mois"
                className="w-full rounded-md border border-line bg-bg/60 py-1.5 pl-2.5 pr-7 font-mono text-base text-fg outline-none focus:border-accent sm:text-[13px]"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted">€</span>
            </div>
            <button type="submit" disabled={pending} className="rounded-md bg-fg px-3 py-1.5 text-[12.5px] font-medium text-bg disabled:opacity-60">
              Fixer
            </button>
          </form>
        )}
        {state.status === "error" && <p className="mt-2 text-[12px] text-red-300">{state.message}</p>}
      </div>
    </section>
  );
}
