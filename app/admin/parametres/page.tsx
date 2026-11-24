import { BarChart3, Building2, Calculator, Mail, Users } from "lucide-react";
import PageHeader from "../PageHeader";
import CompanyForm from "./CompanyForm";
import ResetStats from "./ResetStats";
import TariffsForm from "./TariffsForm";
import TeamManager from "./TeamManager";
import { getInvites, getMe, getStatsResetAt, getTeam, requireManager } from "@/lib/admin";
import { emailEnabled } from "@/lib/email";
import { getCompany, getTariffs } from "@/lib/settings";

export const metadata = { title: "Paramètres" };

export default async function AdminSettings() {
  await requireManager();
  const [tariffs, company, resetAt, team, invites, me] = await Promise.all([
    getTariffs(),
    getCompany(),
    getStatsResetAt(),
    getTeam(),
    getInvites(),
    getMe(),
  ]);
  const mails = emailEnabled();

  return (
    <div className="space-y-4">
      <PageHeader title="Paramètres" description="Réglages de l'atelier." />
      <section id="equipe" className="rounded-lg border border-line bg-panel">
        <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <Users size={14} className="text-muted" aria-hidden />
          <h2 className="text-[13px] font-medium">Équipe</h2>
          <span className="ml-auto text-[11.5px] text-muted">Qui a accès au gestionnaire</span>
        </header>
        <div className="p-4">
          <TeamManager team={team} invites={invites} meId={me?.userId ?? ""} />
        </div>
      </section>
      <section className="rounded-lg border border-line bg-panel">
        <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <Building2 size={14} className="text-muted" aria-hidden />
          <h2 className="text-[13px] font-medium">Entreprise</h2>
          <span className="ml-auto text-[11.5px] text-muted">Affichées sur les devis et factures</span>
        </header>
        <div className="p-4">
          <CompanyForm company={company} />
        </div>
      </section>
      <section className="rounded-lg border border-line bg-panel">
        <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <Calculator size={14} className="text-muted" aria-hidden />
          <h2 className="text-[13px] font-medium">Tarifs</h2>
          <span className="ml-auto text-[11.5px] text-muted">Utilisés par le générateur de devis</span>
        </header>
        <div className="p-4">
          <TariffsForm tariffs={tariffs} />
        </div>
      </section>
      <section className="rounded-lg border border-line bg-panel">
        <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <BarChart3 size={14} className="text-muted" aria-hidden />
          <h2 className="text-[13px] font-medium">Chiffres</h2>
          <span className="ml-auto text-[11.5px] text-muted">Tableau de bord</span>
        </header>
        <div className="p-4">
          <ResetStats resetAt={resetAt?.toISOString() ?? null} />
        </div>
      </section>
      <section className="rounded-lg border border-line bg-panel">
        <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <Mail size={14} className="text-muted" aria-hidden />
          <h2 className="text-[13px] font-medium">Emails aux clients</h2>
          <span className={`ml-auto rounded px-1.5 py-0.5 text-[11.5px] ${mails ? "bg-accent/15 text-accent" : "bg-amber-400/15 text-amber-300"}`}>
            {mails ? "Actifs" : "Désactivés"}
          </span>
        </header>
        <div className="space-y-1 p-4 text-[13px] text-fg/85">
          <p>
            Envoyés automatiquement : confirmation de demande, devis prêt, en impression, commande prête, annulation.
          </p>
          {!mails && (
            <p className="text-[12.5px] text-amber-300">
              Aucun email ne part : la clé Resend (RESEND_API_KEY) n&apos;est pas réglée sur ce serveur. Ajoute-la dans Vercel → Settings →
              Environment Variables, puis redéploie.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
