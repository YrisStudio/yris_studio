import { RotateCcw, Undo2 } from "lucide-react";
import { resetStats, restoreStats } from "../actions";
import PageHeader from "../PageHeader";
import { getStatsResetAt, requireAdmin } from "@/lib/admin";

export const metadata = { title: "Paramètres" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function AdminSettings() {
  await requireAdmin();
  const resetAt = await getStatsResetAt();

  return (
    <div>
      <PageHeader title="Paramètres" description="Réglages du gestionnaire." />

      <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-medium">
          <RotateCcw size={16} className="text-accent" aria-hidden />
          Remettre les chiffres à zéro
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Le chiffre d&apos;affaires réalisé, celui du mois, le graphique sur 6 mois et les montants dépensés par les clients
          repartent de zéro. Les commandes ne sont pas supprimées : elles restent dans la liste des commandes. Les commandes en
          cours et les signalements ne changent pas.
        </p>
        <p className="mt-4 text-sm">
          {resetAt ? (
            <>
              Dernière remise à zéro : <span className="font-medium">{dateFmt.format(resetAt)}</span>
            </>
          ) : (
            <span className="text-muted">Aucune remise à zéro pour l&apos;instant : tous les chiffres sont comptés.</span>
          )}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <form action={resetStats}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition hover:brightness-110"
            >
              <RotateCcw size={14} aria-hidden /> Remettre à zéro maintenant
            </button>
          </form>
          {resetAt && (
            <form action={restoreStats}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-line-strong bg-panel-2 px-4 py-2 text-sm transition hover:bg-fg/5"
              >
                <Undo2 size={14} aria-hidden /> Annuler la remise à zéro
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
