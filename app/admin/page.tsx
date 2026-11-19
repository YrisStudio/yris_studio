import { Hammer } from "lucide-react";
import PageHeader from "./PageHeader";

export const metadata = { title: "Tableau de bord" };

// Point de départ de la refonte : la coque est en place, les pages arrivent une par une.
export default function AdminHome() {
  return (
    <div>
      <PageHeader title="Tableau de bord" description="Le gestionnaire est en cours de reconstruction." />
      <div className="grid place-items-center rounded-xl border border-dashed border-line-strong px-6 py-20 text-center">
        <Hammer size={22} className="text-accent" aria-hidden />
        <p className="mt-3 text-sm font-medium">On repart de zéro.</p>
        <p className="mt-1 max-w-sm text-[13px] text-muted">
          Les nouvelles pages apparaîtront ici et dans le menu au fur et à mesure de la refonte.
        </p>
      </div>
    </div>
  );
}
