import Link from "next/link";
import { Check, Mail, RotateCcw } from "lucide-react";
import { setReportStatus } from "./actions";
import PageHeader from "../PageHeader";
import { requireAdmin } from "@/lib/admin";
import { Mono } from "@/components/ui";
import { reportCategories } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Signalements" };

type Report = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  category: string;
  order_ref: string | null;
  message: string;
  status: string;
  created_at: string;
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

export default async function AdminSignalements({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  await requireAdmin();
  const { vue } = await searchParams;
  const showDone = vue === "traites";

  const supabase = await createClient();
  const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) console.error("Admin signalements :", error.message);
  const all = (data ?? []) as Report[];
  const reports = all.filter((r) => (showDone ? r.status === "traité" : r.status === "nouveau"));

  return (
    <div>
      <PageHeader
        title={showDone ? "Signalements traités" : "Signalements à traiter"}
        description={`${reports.length} signalement(s). Répondez par email, puis marquez-les comme traités.`}
      />

      {reports.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line-strong p-12 text-center text-sm text-muted">
          {showDone ? "Aucun signalement traité." : "Aucun signalement à traiter. Tout va bien."}
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {reports.map((r) => {
            const next = r.status === "nouveau" ? "traité" : "nouveau";
            return (
              <li key={r.id} className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                        {reportCategories.find((c) => c.id === r.category)?.label ?? r.category}
                      </span>
                      {r.order_ref && (
                        <Link
                          href={`/admin/commandes?statut=toutes`}
                          className="rounded-md bg-fg/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-fg"
                        >
                          Commande #{r.order_ref}
                        </Link>
                      )}
                      {!r.user_id && (
                        <span className="rounded-md border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                          sans compte
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-medium">{r.name}</p>
                    <a
                      href={`mailto:${r.email}?subject=${encodeURIComponent("Votre signalement")}`}
                      className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                    >
                      <Mail size={14} aria-hidden />
                      {r.email}
                    </a>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Mono>{dateFmt.format(new Date(r.created_at))}</Mono>
                    <form action={setReportStatus.bind(null, r.id, next)}>
                      <button
                        type="submit"
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm transition ${
                          next === "traité" ? "bg-fg text-bg hover:opacity-85" : "border border-line-strong hover:border-fg"
                        }`}
                      >
                        {next === "traité" ? <Check size={14} aria-hidden /> : <RotateCcw size={14} aria-hidden />}
                        {next === "traité" ? "Marquer traité" : "Rouvrir"}
                      </button>
                    </form>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap rounded-lg bg-panel-2 p-4 text-sm leading-relaxed">{r.message}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
