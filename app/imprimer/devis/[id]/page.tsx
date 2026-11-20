import { notFound } from "next/navigation";
import PrintBar from "./PrintBar";
import { requireAdmin } from "@/lib/admin";
import { getOrder } from "@/lib/orders";
import { getCompany } from "@/lib/settings";
import { formatPrice, orderRef } from "@/lib/site";

export const metadata = { title: "Devis", robots: { index: false } };

const VALIDITY_DAYS = 30;
const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

// Devis au format A4, prêt à être enregistré en PDF (bouton en haut, ou Ctrl+P → « Enregistrer au format PDF »).
// En dehors de /admin : pas de menu du gestionnaire autour de la feuille.
export default async function QuotePrint({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [order, company] = await Promise.all([getOrder(id), getCompany()]);
  if (!order) notFound();

  const lines = order.lines ?? [];
  const total = lines.reduce((n, l) => n + l.qty * l.unit_cents, 0);
  const issued = order.quote_date ? new Date(order.quote_date) : new Date();
  const until = new Date(issued.getTime() + VALIDITY_DAYS * 86_400_000);
  const number = order.quote_number ?? "Brouillon";
  const cityLine = [company.postalCode, company.city].filter(Boolean).join(" ");
  const clientCity = [order.postal_code, order.city].filter(Boolean).join(" ");
  const fileName = `Devis ${order.quote_number ?? orderRef(order.id).slice(1)} - ${company.name}`;

  return (
    <div className="min-h-screen bg-neutral-800 py-6 print:bg-white print:py-0">
      <PrintBar orderId={order.id} title={fileName} draft={!order.quote_number} empty={lines.length === 0} />

      <article className="quote-sheet mx-auto flex min-h-[297mm] w-[210mm] max-w-full flex-col bg-white px-[16mm] py-[14mm] text-[10.5pt] leading-snug text-neutral-900 shadow-2xl print:min-h-0 print:w-auto print:p-0 print:shadow-none">
        {/* En-tête : logo et entreprise / numéro et dates */}
        <header className="flex items-start justify-between gap-8">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/yris-logo-horizontal-light-transparent.svg" alt={company.name} className="-ml-3 h-16 w-auto" />
            <div className="mt-3 text-[9pt] leading-relaxed text-neutral-600">
              <p className="font-semibold text-neutral-900">{company.legalName || company.name}</p>
              {company.status && <p>{company.status}</p>}
              {company.address && <p>{company.address}</p>}
              {cityLine && <p>{cityLine}</p>}
              {company.siret && <p>SIRET {company.siret}</p>}
              <p>{[company.email, company.phone].filter(Boolean).join(" · ")}</p>
              {company.website && <p>{company.website}</p>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-[22pt] font-semibold tracking-tight">Devis</h1>
            <p className="font-mono text-[11pt]">{number}</p>
            <dl className="mt-3 text-[9pt] text-neutral-600">
              <div>
                <dt className="inline">Date : </dt>
                <dd className="inline text-neutral-900">{longDate.format(issued)}</dd>
              </div>
              <div>
                <dt className="inline">Valable jusqu&apos;au : </dt>
                <dd className="inline text-neutral-900">{longDate.format(until)}</dd>
              </div>
              <div>
                <dt className="inline">Référence : </dt>
                <dd className="inline font-mono text-neutral-900">{orderRef(order.id)}</dd>
              </div>
            </dl>
          </div>
        </header>

        {/* Client */}
        <section className="mt-8 ml-auto w-[80mm] max-w-full rounded-md border border-neutral-200 p-4">
          <p className="text-[8.5pt] font-medium uppercase tracking-wider text-neutral-500">Client</p>
          <p className="mt-1 font-semibold">{order.customer_name || order.customer_email || "Client"}</p>
          <div className="text-[9.5pt] text-neutral-700">
            {order.customer_company && <p>{order.customer_company}</p>}
            {order.address && <p>{order.address}</p>}
            {clientCity && <p>{clientCity}</p>}
            {order.customer_email && <p>{order.customer_email}</p>}
            {order.phone && <p>{order.phone}</p>}
          </div>
        </section>

        {/* Lignes */}
        <table className="mt-8 w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-neutral-900 text-[8.5pt] uppercase tracking-wider text-neutral-500">
              <th className="py-2 font-medium">Désignation</th>
              <th className="w-16 py-2 text-right font-medium">Qté</th>
              <th className="w-28 py-2 text-right font-medium">Prix unitaire</th>
              <th className="w-28 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-neutral-200 align-top">
                <td className="py-2.5 pr-4">{l.label}</td>
                <td className="py-2.5 text-right font-mono">{l.qty}</td>
                <td className="py-2.5 text-right font-mono">{formatPrice(l.unit_cents)}</td>
                <td className="py-2.5 text-right font-mono">{formatPrice(l.qty * l.unit_cents)}</td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-neutral-500">
                  Aucune ligne : prépare d&apos;abord le devis dans la fiche commande.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totaux */}
        <div className="mt-4 ml-auto w-[80mm] max-w-full text-[10pt]">
          <div className="flex justify-between py-1 text-neutral-600">
            <span>Total HT</span>
            <span className="font-mono">{formatPrice(total)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-neutral-900 py-2 text-[13pt] font-semibold">
            <span>Total à payer</span>
            <span className="font-mono">{formatPrice(total)}</span>
          </div>
          {company.vat && <p className="text-right text-[8.5pt] text-neutral-500">{company.vat}</p>}
        </div>

        {/* Conditions et signature */}
        <div className="mt-auto pt-10 text-[9pt] text-neutral-600">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="font-medium text-neutral-900">Conditions</p>
              <p>Devis valable {VALIDITY_DAYS} jours.</p>
              {company.paymentTerms && <p>{company.paymentTerms}.</p>}
              <p>Délai de fabrication confirmé à la validation.</p>
            </div>
            <div className="rounded-md border border-dashed border-neutral-300 p-3">
              <p className="font-medium text-neutral-900">Bon pour accord</p>
              <p className="text-[8.5pt]">Date et signature du client</p>
              <div className="h-14" />
            </div>
          </div>
          <p className="mt-6 border-t border-neutral-200 pt-2 text-center text-[8pt] text-neutral-400">
            {[company.legalName || company.name, company.siret && `SIRET ${company.siret}`, company.website].filter(Boolean).join(" · ")}
          </p>
        </div>
      </article>
    </div>
  );
}
