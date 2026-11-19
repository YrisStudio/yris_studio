"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle, Plus } from "lucide-react";
import { addJobFromOrder } from "../../atelier/actions";

// Envoie la commande dans la file d'impression de l'atelier (avec les grammes et heures du devis).
export default function AddToQueue({ id, ready }: { id: string; ready: boolean }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending || !ready}
        onClick={() =>
          start(async () => {
            const res = await addJobFromOrder(id);
            setMessage({ ok: res.status !== "error", text: res.message ?? "" });
          })
        }
        className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1 text-[12.5px] transition hover:bg-fg/5 disabled:opacity-50"
      >
        {pending ? <LoaderCircle size={12} className="animate-spin" aria-hidden /> : <Plus size={12} aria-hidden />}
        Ajouter à la file d&apos;impression
      </button>
      {!ready && <span className="text-[11.5px] text-muted">Enregistrez d&apos;abord le devis (durée d&apos;impression).</span>}
      {message?.text && (
        <span role="status" className={`text-[12px] ${message.ok ? "text-accent" : "text-red-300"}`}>
          {message.text}
          {message.ok && (
            <>
              {" · "}
              <Link href="/admin/atelier" className="underline underline-offset-2">
                Voir l&apos;atelier
              </Link>
            </>
          )}
        </span>
      )}
    </div>
  );
}
