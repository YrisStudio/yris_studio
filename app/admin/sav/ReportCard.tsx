"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle, Mail, RotateCcw } from "lucide-react";
import { launchReprint, saveResolution, setReportStatus, type SavState } from "./actions";
import type { PrintJob } from "@/lib/atelier";
import { reportStatuses, reportStatusMeta, type Report } from "@/lib/reports";
import { orderRef, reportCategories } from "@/lib/site";

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });
const categoryLabel = Object.fromEntries(reportCategories.map((c) => [c.id, c.label]));

export default function ReportCard({
  report: r,
  order,
  reprints,
}: {
  report: Report;
  order: { id: string; title: string; hasQuote: boolean } | null;
  reprints: PrintJob[];
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [state, action, saving] = useActionState<SavState, FormData>(saveResolution.bind(null, r.id), { status: "idle" });

  function run(fn: () => Promise<SavState>) {
    start(async () => {
      const res = await fn();
      setMessage(res.message || res.status === "error" ? { ok: res.status !== "error", text: res.message ?? "" } : null);
    });
  }

  return (
    <li className="rounded-lg border border-line bg-panel">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium">
            {r.name}
            <span className="rounded bg-fg/[0.07] px-1.5 py-px text-[11px] font-normal text-muted">{categoryLabel[r.category] ?? r.category}</span>
            {r.order_ref &&
              (order ? (
                <Link href={`/admin/commandes/${order.id}`} className="font-mono text-[11.5px] font-normal text-muted hover:text-accent">
                  {orderRef(order.id)} · {order.title}
                </Link>
              ) : (
                <span className="font-mono text-[11.5px] font-normal text-muted">{r.order_ref} (commande introuvable)</span>
              ))}
          </p>
          <p className="text-[11.5px] text-muted">{dateTime.format(new Date(r.created_at))}</p>
        </div>
        <a
          href={`mailto:${r.email}?subject=${encodeURIComponent("Votre signalement Yris")}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[12px] text-muted transition hover:border-line-strong hover:text-fg"
        >
          <Mail size={12} aria-hidden /> Répondre
        </a>
      </div>

      <p className="whitespace-pre-line px-4 py-3 text-[13.5px] leading-relaxed">{r.message}</p>

      <div className="space-y-3 border-t border-line px-4 py-3">
        {/* Statut */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-line bg-bg/50 p-0.5 text-[12px]" role="group" aria-label="Statut">
            {reportStatuses.map((s) => (
              <button
                key={s}
                type="button"
                disabled={pending}
                onClick={() => run(() => setReportStatus(r.id, s))}
                aria-pressed={r.status === s}
                className={`rounded px-2 py-0.5 transition ${r.status === s ? reportStatusMeta[s].pill : "text-muted hover:text-fg"}`}
              >
                {reportStatusMeta[s].label}
              </button>
            ))}
          </div>
          {order && (
            <button
              type="button"
              disabled={pending || !order.hasQuote}
              title={order.hasQuote ? undefined : "La commande n'a pas de devis calculé"}
              onClick={() => confirm("Relancer gratuitement l'impression de cette commande ?") && run(() => launchReprint(r.id, order.id))}
              className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1 text-[12px] transition hover:bg-fg/5 disabled:opacity-40"
            >
              <RotateCcw size={12} aria-hidden /> Réimpression gratuite
            </button>
          )}
          {pending && <LoaderCircle size={13} className="animate-spin text-muted" aria-hidden />}
          {message?.text && <span className={`text-[12px] ${message.ok ? "text-accent" : "text-red-300"}`}>{message.text}</span>}
        </div>

        {reprints.length > 0 && (
          <ul className="space-y-1">
            {reprints.map((j) => (
              <li key={j.id} className="flex items-center gap-2 text-[12.5px]">
                <RotateCcw size={11} className="text-muted" aria-hidden />
                <Link href="/admin/atelier" className="min-w-0 flex-1 truncate hover:text-accent">
                  {j.title}
                </Link>
                <span className="text-[11.5px] text-muted">{j.status}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Résolution */}
        <form action={action}>
          <label htmlFor={`res-${r.id}`} className="mb-1 block text-[11.5px] text-muted">
            Ce qui a été fait (note interne)
          </label>
          <textarea
            id={`res-${r.id}`}
            name="resolution"
            rows={2}
            maxLength={4000}
            defaultValue={r.resolution ?? ""}
            placeholder="Remboursé, pièce réimprimée en PETG, client rappelé…"
            className="w-full resize-y rounded-md border border-line bg-bg/60 px-2.5 py-2 text-base text-fg outline-none placeholder:text-muted/70 focus:border-accent sm:text-[13px]"
          />
          <div className="mt-1.5 flex items-center gap-3">
            <button type="submit" disabled={saving} className="rounded-md border border-line-strong px-2.5 py-1 text-[12px] transition hover:bg-fg/5 disabled:opacity-60">
              Enregistrer
            </button>
            {state.message && <span className={`text-[12px] ${state.status === "error" ? "text-red-300" : "text-accent"}`}>{state.message}</span>}
          </div>
        </form>
      </div>
    </li>
  );
}
