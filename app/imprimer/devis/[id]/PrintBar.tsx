"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

// Barre au-dessus de la feuille (cachée à l'impression). Le titre de la page devient le nom du fichier PDF.
export default function PrintBar({
  orderId,
  title,
  draft,
  empty,
  kind = "devis",
}: {
  orderId: string;
  title: string;
  draft: boolean;
  empty: boolean;
  kind?: "devis" | "facture" | "etiquette";
}) {
  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div className="mx-auto mb-4 flex w-[210mm] max-w-full flex-wrap items-center gap-3 px-3 text-[13px] text-neutral-200 print:hidden">
      <Link href={`/admin/commandes/${orderId}`} className="inline-flex items-center gap-1 text-neutral-400 hover:text-white">
        <ArrowLeft size={14} aria-hidden /> Retour à la commande
      </Link>
      {draft && !empty && (
        <span className="rounded bg-amber-400/15 px-2 py-0.5 text-[12px] text-amber-300">
          {kind === "facture" ? "Brouillon : émettez la facture dans la fiche commande pour avoir son numéro" : "Brouillon : le numéro est attribué à l'envoi du devis"}
        </span>
      )}
      <button
        type="button"
        onClick={() => window.print()}
        disabled={empty}
        className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 font-medium text-neutral-900 disabled:opacity-50"
      >
        <Download size={14} aria-hidden /> {kind === "etiquette" ? "Imprimer" : "Télécharger en PDF"}
      </button>
    </div>
  );
}
