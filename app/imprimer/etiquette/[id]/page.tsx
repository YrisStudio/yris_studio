import { notFound } from "next/navigation";
import QRCode from "qrcode";
import PrintBar from "../../devis/[id]/PrintBar";
import { requireAdmin } from "@/lib/admin";
import { getOrder } from "@/lib/orders";
import { getCompany } from "@/lib/settings";
import { orderRef, site } from "@/lib/site";

export const metadata = { title: "Étiquette", robots: { index: false } };

// Étiquette d'adresse au format A6 (10 × 15 cm), à coller sur le colis.
// Sans compte transporteur : on l'imprime, puis on dépose le colis avec son bordereau.
export default async function LabelPrint({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [order, company] = await Promise.all([getOrder(id), getCompany()]);
  if (!order) notFound();

  const ref = orderRef(order.id);
  const qr = await QRCode.toDataURL(`${site.url}/compte`, { margin: 0, width: 160 });
  const empty = !order.address || !order.city;

  return (
    <div className="min-h-screen bg-neutral-800 py-6 print:bg-white print:py-0">
      <style>{`@page { size: 105mm 148mm; margin: 0; }`}</style>
      <PrintBar orderId={order.id} title={`Étiquette ${ref.slice(1)}`} draft={false} empty={empty} kind="etiquette" />
      {empty && <p className="mx-auto mb-4 w-[105mm] text-center text-[13px] text-amber-300 print:hidden">Adresse de livraison incomplète dans la commande.</p>}

      <article className="mx-auto flex h-[148mm] w-[105mm] flex-col bg-white p-[7mm] text-neutral-900 shadow-2xl print:shadow-none">
        <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-3">
          <div className="text-[8pt] leading-snug">
            <p className="text-[7pt] font-semibold uppercase tracking-wider text-neutral-500">Expéditeur</p>
            <p className="font-semibold">{company.name}</p>
            {company.address && <p>{company.address}</p>}
            <p>{[company.postalCode, company.city].filter(Boolean).join(" ")}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/yris-logo-horizontal-light-transparent.svg" alt="" className="-mr-2 h-9 w-auto" />
        </div>

        <div className="flex flex-1 flex-col justify-center py-4">
          <p className="text-[8pt] font-semibold uppercase tracking-wider text-neutral-500">Destinataire</p>
          <p className="mt-1 text-[17pt] font-bold leading-tight">{order.customer_name ?? "Client"}</p>
          {order.customer_company && <p className="text-[12pt]">{order.customer_company}</p>}
          <p className="mt-1 text-[14pt] leading-snug">{order.address}</p>
          <p className="text-[16pt] font-semibold tracking-wide">
            {order.postal_code} {order.city?.toUpperCase()}
          </p>
          {order.phone && <p className="mt-1 text-[10pt] text-neutral-600">Tél. {order.phone}</p>}
        </div>

        <div className="flex items-end justify-between border-t-2 border-neutral-900 pt-3">
          <div className="text-[8pt] leading-snug">
            <p className="font-mono text-[14pt] font-bold">{ref}</p>
            <p className="text-neutral-600">{order.product_name ?? "Commande"} · × {order.quantity}</p>
            {order.tracking_number && <p className="font-mono">{order.carrier} {order.tracking_number}</p>}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="" className="size-[18mm]" />
        </div>
      </article>
    </div>
  );
}
