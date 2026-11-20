import { Building2, Calculator } from "lucide-react";
import PageHeader from "../PageHeader";
import CompanyForm from "./CompanyForm";
import TariffsForm from "./TariffsForm";
import { requireAdmin } from "@/lib/admin";
import { getCompany, getTariffs } from "@/lib/settings";

export const metadata = { title: "Paramètres" };

export default async function AdminSettings() {
  await requireAdmin();
  const [tariffs, company] = await Promise.all([getTariffs(), getCompany()]);

  return (
    <div className="space-y-4">
      <PageHeader title="Paramètres" description="Réglages de l'atelier." />
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
    </div>
  );
}
