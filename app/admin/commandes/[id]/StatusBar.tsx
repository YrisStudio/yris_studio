"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { setOrderStatus } from "../actions";
import { boardStatuses, statusMeta } from "@/lib/orders-meta";

// Étapes cliquables : un clic fait passer la commande au statut choisi (et prévient le client).
export default function StatusBar({ id, status }: { id: string; status: string }) {
  const [current, setCurrent] = useOptimistic(status);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const index = boardStatuses.indexOf(current as (typeof boardStatuses)[number]);
  const cancelled = current === "annulée";

  function go(next: string) {
    if (next === current) return;
    if (next === "annulée" && !confirm("Annuler cette commande ? Le client sera prévenu par email.")) return;
    // Revenir en arrière est rare : on demande confirmation pour éviter un clic de travers.
    const back = boardStatuses.indexOf(next as (typeof boardStatuses)[number]) < index && !cancelled;
    if (back && !confirm(`Revenir à « ${statusMeta[next as (typeof boardStatuses)[number]].label} » ?`)) return;
    start(async () => {
      setCurrent(next);
      const res = await setOrderStatus(id, next);
      setMessage({ ok: res.status !== "error", text: res.message ?? "" });
    });
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-1.5">
      <ol className="grid grid-cols-2 gap-1 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        {boardStatuses.map((s, i) => {
          const done = !cancelled && i < index;
          const active = !cancelled && i === index;
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => go(s)}
                disabled={pending}
                aria-current={active ? "step" : undefined}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12.5px] transition ${
                  active ? "bg-fg/[0.08] text-fg" : done ? "text-fg/80 hover:bg-fg/[0.04]" : "text-muted hover:bg-fg/[0.04] hover:text-fg"
                }`}
              >
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-full border text-[10px] ${
                    done ? "border-accent bg-accent text-on-accent" : active ? "border-accent text-accent" : "border-line-strong"
                  }`}
                >
                  {done ? <Check size={11} strokeWidth={3} aria-hidden /> : i + 1}
                </span>
                {statusMeta[s].label}
              </button>
            </li>
          );
        })}
        <li className="col-span-2 sm:col-span-1">
          <button
            type="button"
            onClick={() => go(cancelled ? "reçue" : "annulée")}
            disabled={pending}
            className={`flex w-full items-center justify-center gap-1.5 rounded-md px-2.5 py-2 text-[12.5px] transition ${
              cancelled ? "bg-red-400/15 text-red-300" : "text-muted hover:bg-red-400/10 hover:text-red-300"
            }`}
          >
            <X size={13} aria-hidden /> {cancelled ? "Annulée · rouvrir" : "Annuler"}
          </button>
        </li>
      </ol>
      {message?.text && (
        <p role="status" className={`px-2.5 pb-1 pt-1.5 text-[12px] ${message.ok ? "text-accent" : "text-red-300"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
