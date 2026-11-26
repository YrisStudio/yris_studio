"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle, Send } from "lucide-react";
import { winBackClient } from "./actions";

type Row = { email: string; name: string; key: string; lastOrder: string; spent: string; relancedAt: string | null };

// Clients qui ont déjà commandé mais plus rien depuis longtemps : un email + un code de réduction.
export default function WinBack({ rows }: { rows: Row[] }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  if (!rows.length) return <p className="px-4 py-4 text-[13px] text-muted">Personne à relancer : tous vos clients ont commandé il y a moins de 4 mois.</p>;
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => (
        <li key={r.email} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-[13px]">
          <Link href={`/admin/clients/${r.key}`} className="min-w-0 flex-1 truncate hover:text-accent">
            {r.name} <span className="text-muted">· dernière commande {r.lastOrder} · {r.spent}</span>
          </Link>
          {r.relancedAt && !done[r.email] && <span className="text-[11.5px] text-muted">relancé le {r.relancedAt}</span>}
          {done[r.email] ? (
            <span className="text-[12px] text-accent">{done[r.email]}</span>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm(`Envoyer un email de relance à ${r.email}, avec un code de −10 % ?`)) return;
                setBusy(r.email);
                start(async () => {
                  const res = await winBackClient(r.email);
                  setDone((d) => ({ ...d, [r.email]: res.message }));
                  setBusy(null);
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[12px] hover:border-line-strong disabled:opacity-50"
            >
              {busy === r.email ? <LoaderCircle size={12} className="animate-spin" aria-hidden /> : <Send size={12} aria-hidden />} Relancer
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
