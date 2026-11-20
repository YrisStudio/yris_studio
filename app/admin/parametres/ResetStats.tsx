"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Undo2 } from "lucide-react";
import { setStatsReset } from "./actions";

const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });

// Repartir de zéro dans le tableau de bord (ex. début d'année) sans rien supprimer.
export default function ResetStats({ resetAt }: { resetAt: string | null }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function run(reset: boolean) {
    const ask = reset
      ? "Remettre le chiffre d'affaires et les statistiques à zéro à partir de maintenant ?\n\nLes commandes restent visibles, elles ne comptent juste plus dans les chiffres. Tu pourras annuler."
      : "Annuler la remise à zéro et recompter toutes les ventes ?";
    if (!confirm(ask)) return;
    start(async () => {
      const res = await setStatsReset(reset);
      setMessage({ ok: res.status === "success", text: res.message ?? "" });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="min-w-0 flex-1 text-[13px] text-fg/85">
        {resetAt ? (
          <>
            Chiffres comptés depuis le <span className="font-medium text-fg">{date.format(new Date(resetAt))}</span>.
          </>
        ) : (
          "Toutes les ventes depuis le début sont comptées."
        )}
        <span className="block text-[11.5px] text-muted">Les commandes ne sont jamais supprimées.</span>
      </p>
      {resetAt && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(false)}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[12.5px] text-muted hover:text-fg disabled:opacity-60"
        >
          <Undo2 size={13} aria-hidden /> Annuler la remise à zéro
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-red-400/40 px-3 py-1.5 text-[12.5px] text-red-300 hover:bg-red-400/10 disabled:opacity-60"
      >
        <RotateCcw size={13} aria-hidden /> Remettre à zéro
      </button>
      {message && (
        <p role="status" className={`w-full text-[12.5px] ${message.ok ? "text-accent" : "text-red-300"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
