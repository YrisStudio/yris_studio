import { Calculator, QrCode } from "lucide-react";
import PageHeader from "../PageHeader";
import PriceCalculator from "./PriceCalculator";
import QrGenerator from "./QrGenerator";
import { requireAdmin } from "@/lib/admin";
import { getTariffs } from "@/lib/settings";

export const metadata = { title: "Outils" };

export default async function AdminTools() {
  await requireAdmin();
  const tariffs = await getTariffs();

  return (
    <div className="space-y-4">
      <PageHeader title="Outils" description="Petits outils du quotidien." />
      <section id="prix" className="scroll-mt-20 rounded-lg border border-line bg-panel">
        <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <Calculator size={14} className="text-muted" aria-hidden />
          <h2 className="text-[13px] font-medium">Calculateur de prix</h2>
          <span className="ml-auto text-[11.5px] text-muted">Même calcul que les devis</span>
        </header>
        <div className="p-4">
          <PriceCalculator tariffs={tariffs} />
        </div>
      </section>
      <section id="qr" className="scroll-mt-20 rounded-lg border border-line bg-panel">
        <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <QrCode size={14} className="text-muted" aria-hidden />
          <h2 className="text-[13px] font-medium">QR code</h2>
          <span className="ml-auto text-[11.5px] text-muted">Cartes, étiquettes, stands</span>
        </header>
        <div className="p-4">
          <QrGenerator />
        </div>
      </section>
    </div>
  );
}
