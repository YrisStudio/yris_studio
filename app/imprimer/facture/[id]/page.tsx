import { notFound } from "next/navigation";
import PrintBar from "../../devis/[id]/PrintBar";
import { requireAdmin } from "@/lib/admin";
import { getOrder } from "@/lib/orders";
import { getCompany } from "@/lib/settings";
import { formatPrice, orderRef } from "@/lib/site";

export const metadata = { title: "Facture", robots: { index: false } };

const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

// Facture conforme pour une micro-entreprise (franchise de TVA) : numéro unique et chronologique,
// identité du vendeur (EI, SIRET), date de vente, détail des lignes, mention TVA, conditions de paiement.
export default async function InvoicePrint({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [order, company] = await Promise.all([getOrder(id), getCompany()]);
  if (!order) notFound();

  const lines = order.lines ?? [];
  const subtotal = lines.reduce((n, l) => n + l.qty * l.unit_cents, 0);
  const discount = order.discount_cents ?? 0;
  const total = order.final_cents ?? subtotal - discount;
  const refunded = order.refunded_cents ?? 0;
  const issued = order.invoice_date ? new Date(`${order.invoice_date}T12:00:00`) : new Date();
  const sold = order.paid_at ? new Date(order.paid_at) : new Date(order.updated_at ?? order.created_at);
  const cityLine = [company.postalCode, company.city].filter(Boolean).join(" ");
  const clientCity = [order.postal_code, order.city].filter(Boolean).join(" ");
  const number = order.invoice_number ?? "Brouillon";
  const fileName = `Facture ${order.invoice_number ?? orderRef(order.id).slice(1)} - ${company.name}`;
  // Mention obligatoire pour un entrepreneur individuel : « EI » à côté du nom.
  const seller = company.legalName || company.name;
  const sellerName = /\bEI\b/.test(seller) || !/entrepreneur individuel|micro/i.test(company.status) ? seller : `${seller} EI`;
  const isPro = Boolean(order.customer_company);

  return (
    <div className="min-h-screen bg-neutral-800 py-6 print:bg-white print:py-0">
      <PrintBar orderId={order.id} title={fileName} draft={!order.invoice_number} empty={lines.length === 0} kind="facture" />

      <article className="mx-auto flex min-h-[297mm] w-[210mm] max-w-full flex-col bg-white px-[16mm] py-[14mm] text-[10.5pt] leading-snug text-neutral-900 shadow-2xl print:min-h-0 print:w-auto print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-8">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/yris-logo-horizontal-light-transparent.svg" alt={company.name} className="-ml-3 h-16 w-auto" />
            <div className="mt-3 text-[9pt] leading-relaxed text-neutral-600">
              <p className="font-semibold text-neutral-900">{sellerName}</p>
              {company.status && <p>{company.status}</p>}
              {company.address && <p>{company.address}</p>}
              {cityLine && <p>{cityLine}</p>}
              {company.siret && <p>SIRET {company.siret}</p>}
              <p>{[company.email, company.phone].filter(Boolean).join(" · ")}</p>
              {company.website && <p>{company.website}</p>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-[22pt] font-semibold tracking-tight">Facture</h1>
            <p className="font-mono text-[11pt]">{number}</p>
            <dl className="mt-3 text-[9pt] text-neutral-600">
              <div>
                <dt className="inline">Date de facture : </dt>
                <dd className="inline text-neutral-900">{longDate.format(issued)}</dd>
              </div>
              <div>
                <dt className="inline">Date de vente : </dt>
                <dd className="inline text-neutral-900">{longDate.format(sold)}</dd>
              </div>
              <div>
                <dt className="inline">Commande : </dt>
                <dd className="inline font-mono text-neutral-900">{orderRef(order.id)}</dd>
              </div>
              {order.quote_number && (
                <div>
                  <dt className="inline">Devis : </dt>
                  <dd className="inline font-mono text-neutral-900">{order.quote_number}</dd>
                </div>
              )}
            </dl>
          </div>
        </header>

        <section className="mt-8 ml-auto w-[80mm] max-w-full rounded-md border border-neutral-200 p-4">
          <p className="text-[8.5pt] font-medium uppercase tracking-wider text-neutral-500">Facturé à</p>
          <p className="mt-1 font-semibold">{order.customer_name || order.customer_email || "Client"}</p>
          <div className="text-[9.5pt] text-neutral-700">
            {order.customer_company && <p>{order.customer_company}</p>}
            {order.address && <p>{order.address}</p>}
            {clientCity && <p>{clientCity}</p>}
            {order.customer_email && <p>{order.customer_email}</p>}
          </div>
        </section>

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
            {discount > 0 && (
              <tr className="border-b border-neutral-200">
                <td className="py-2.5 pr-4">Remise{order.promo_code ? ` (code ${order.promo_code})` : ""}</td>
                <td className="py-2.5 text-right font-mono">1</td>
                <td className="py-2.5 text-right font-mono">−{formatPrice(discount)}</td>
                <td className="py-2.5 text-right font-mono">−{formatPrice(discount)}</td>
              </tr>
            )}
            {lines.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-neutral-500">
                  Aucune ligne : prépare d&apos;abord le devis dans la fiche commande.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-[80mm] max-w-full text-[10pt]">
          <div className="flex justify-between py-1 text-neutral-600">
            <span>Total HT</span>
            <span className="font-mono">{formatPrice(total)}</span>
          </div>
          <div className="flex justify-between py-1 text-neutral-600">
            <span>TVA</span>
            <span className="font-mono">0,00 €</span>
          </div>
          <div className="flex justify-between border-t-2 border-neutral-900 py-2 text-[13pt] font-semibold">
            <span>Total TTC</span>
            <span className="font-mono">{formatPrice(total)}</span>
          </div>
          {refunded > 0 && (
            <div className="flex justify-between py-1 text-neutral-600">
              <span>Remboursé</span>
              <span className="font-mono">−{formatPrice(refunded)}</span>
            </div>
          )}
          <p className="text-right text-[8.5pt] text-neutral-500">{company.vat || "TVA non applicable, art. 293 B du CGI"}</p>
        </div>

        <div className="mt-auto pt-10 text-[9pt] text-neutral-600">
          <p className="font-medium text-neutral-900">Paiement</p>
          {order.payment === "payée" && order.paid_at ? (
            <p>Payée par carte bancaire le {longDate.format(new Date(order.paid_at))}.</p>
          ) : (
            <p>{company.paymentTerms || "Paiement à réception"}.</p>
          )}
          <p>Pas d&apos;escompte pour paiement anticipé.</p>
          {isPro && (
            <p>
              En cas de retard de paiement : pénalités au taux de trois fois le taux d&apos;intérêt légal, et indemnité forfaitaire pour frais de
              recouvrement de 40 €.
            </p>
          )}
          <p className="mt-6 border-t border-neutral-200 pt-2 text-center text-[8pt] text-neutral-400">
            {[sellerName, company.siret && `SIRET ${company.siret}`, company.vat, company.website].filter(Boolean).join(" · ")}
          </p>
        </div>
      </article>
    </div>
  );
}
