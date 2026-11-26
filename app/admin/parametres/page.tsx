import { BarChart3, Building2, Calculator, Mail, MessageSquareText, Plug, ShieldCheck, Users } from "lucide-react";
import PageHeader from "../PageHeader";
import CommForm from "./CommForm";
import CompanyForm from "./CompanyForm";
import MfaSetup from "./MfaSetup";
import ResetStats from "./ResetStats";
import TariffsForm from "./TariffsForm";
import TeamManager from "./TeamManager";
import { getInvites, getMe, getStatsResetAt, getTeam, requireManager } from "@/lib/admin";
import { emailEnabled, statusCopy } from "@/lib/email";
import { stripeEnabled } from "@/lib/stripe";
import { getComm, getCompany, getTariffs } from "@/lib/settings";

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
  const comm = await getComm();
  // État des services branchés (sans jamais afficher les clés).
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  const integrations = [
    { name: "Base de données (Supabase)", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), note: "Comptes, commandes, stock, photos" },
    { name: "Emails (Resend)", ok: emailEnabled(), note: "Emails clients et boîte de réception contact@" },
    { name: "Paiement (Stripe)", ok: stripeEnabled, note: stripeEnabled ? (stripeKey.startsWith("sk_live") ? "Mode réel : les paiements sont encaissés" : "Mode test : aucun vrai paiement") : "Les commandes passent sans paiement en ligne" },
    { name: "Clé serveur Supabase", ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), note: "Webhook Stripe, fichiers des demandes, parrainage" },
    { name: "Statistiques (Vercel Analytics)", ok: true, note: "Visites du site, dans le tableau de bord Vercel" },
    { name: "Google Workspace", ok: true, note: "contact@yris-studio.com relié au gestionnaire" },
  ];
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
      <section id="emails" className="rounded-lg border border-line bg-panel">
        <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <MessageSquareText size={14} className="text-muted" aria-hidden />
          <h2 className="text-[13px] font-medium">Emails et communication</h2>
        </header>
        <div className="p-4">
          <CommForm comm={comm} defaults={statusCopy} />
        </div>
      </section>
      <section id="integrations" className="rounded-lg border border-line bg-panel">
        <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <Plug size={14} className="text-muted" aria-hidden />
          <h2 className="text-[13px] font-medium">Services connectés</h2>
        </header>
        <ul className="divide-y divide-line">
          {integrations.map((it) => (
            <li key={it.name} className="flex items-center gap-3 px-4 py-2 text-[13px]">
              <span className={`size-2 shrink-0 rounded-full ${it.ok ? "bg-accent" : "bg-red-400"}`} aria-hidden />
              <span className="w-56 shrink-0">{it.name}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-muted">{it.note}</span>
              <span className={`text-[12px] ${it.ok ? "text-accent" : "text-red-300"}`}>{it.ok ? "Connecté" : "Non branché"}</span>
            </li>
          ))}
        </ul>
      </section>
      <section id="securite" className="rounded-lg border border-line bg-panel">
        <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <ShieldCheck size={14} className="text-muted" aria-hidden />
          <h2 className="text-[13px] font-medium">Double authentification</h2>
          <span className="ml-auto text-[11.5px] text-muted">Pour votre compte uniquement</span>
        </header>
        <div className="p-4">
          <MfaSetup />
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
