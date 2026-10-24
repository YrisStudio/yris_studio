import { FileBox, Mail, MapPin, Phone, Store, UserRound } from "lucide-react";
import OrderEditor from "./OrderEditor";
import PageHeader from "../PageHeader";
import { requireAdmin } from "@/lib/admin";
import { Mono } from "@/components/ui";
import { formatPrice, orderRef, requestTypes } from "@/lib/site";
import { getAllOrders, isOpen, type AdminOrder } from "@/lib/orders";

export const metadata = { title: "Commandes" };

const filters = [
  { id: "a-realiser", label: "À réaliser", test: (o: AdminOrder) => isOpen(o.status) },
  { id: "terminees", label: "Terminées", test: (o: AdminOrder) => o.status === "terminée" },
  { id: "annulees", label: "Annulées", test: (o: AdminOrder) => o.status === "annulée" },
  { id: "toutes", label: "Toutes", test: () => true },
];

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

const statusStyle: Record<string, string> = {
  reçue: "bg-fg/10 text-fg",
  "devis envoyé": "bg-sky-500/15 text-sky-700",
  "en impression": "bg-accent/15 text-accent",
  terminée: "bg-emerald-500/15 text-emerald-700",
  annulée: "bg-red-500/15 text-red-700",
};

function Row({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-sm">
      <Icon size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

export default async function AdminCommandes({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  await requireAdmin();
  const { statut } = await searchParams;
  const active = filters.find((f) => f.id === statut) ?? filters[0];
  const all = await getAllOrders();
  const orders = all.filter(active.test);

  return (
    <div>
      <PageHeader
        title={`Commandes · ${active.label}`}
        description={`${orders.length} commande(s). Cliquez sur l'email d'un client pour lui répondre.`}
      />

      {orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line-strong p-12 text-center text-sm text-muted">
          Aucune commande dans cette catégorie.
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((o) => {
            const type = requestTypes.find((t) => t.id === o.kind);
            return (
              <li key={o.id} id={o.id} className="scroll-mt-24 rounded-2xl border border-line bg-panel p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium">{orderRef(o.id)}</span>
                      <span className="rounded-md bg-fg/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                        {type?.label ?? o.kind}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                          statusStyle[o.status] ?? statusStyle["reçue"]
                        }`}
                      >
                        {o.status}
                      </span>
                      {!o.user_id && (
                        <span className="rounded-md border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                          sans compte
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xl font-medium tracking-tight">
                      {o.product_name ?? "Demande sur mesure"}
                      <span className="text-muted"> × {o.quantity}</span>
                    </p>
                    <Mono>Reçue le {dateFmt.format(new Date(o.created_at))}</Mono>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-medium tracking-tight">
                      {o.final_cents !== null
                        ? formatPrice(o.final_cents)
                        : o.estimated_cents !== null
                          ? formatPrice(o.estimated_cents)
                          : "À chiffrer"}
                    </p>
                    <Mono>{o.final_cents !== null ? "prix final" : o.estimated_cents !== null ? "prix estimé" : "devis à faire"}</Mono>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr_360px]">
                  <div className="space-y-2.5">
                    <Mono className="block">Client</Mono>
                    <Row icon={UserRound}>{o.customer_name ?? "Non précisé"}</Row>
                    {o.customer_email && (
                      <Row icon={Mail}>
                        <a href={`mailto:${o.customer_email}?subject=${encodeURIComponent(`Votre commande ${orderRef(o.id)}`)}`} className="text-accent hover:underline">
                          {o.customer_email}
                        </a>
                      </Row>
                    )}
                    <Row icon={Phone}>
                      {o.phone ? (
                        <a href={`tel:${o.phone}`} className="hover:underline">
                          {o.phone}
                        </a>
                      ) : (
                        <span className="text-muted">Pas de téléphone</span>
                      )}
                    </Row>
                    {o.delivery === "retrait" ? (
                      <Row icon={Store}>Retrait en main propre</Row>
                    ) : (
                      <Row icon={MapPin}>
                        {o.address ? (
                          <>
                            {o.address}
                            <br />
                            {o.postal_code} {o.city}
                          </>
                        ) : (
                          <span className="text-muted">Pas d&apos;adresse</span>
                        )}
                      </Row>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <Mono className="block">Détail</Mono>
                    <p className="text-sm">
                      <span className="text-muted">Matériau :</span> {o.material ?? "à conseiller"}
                    </p>
                    {o.details && <p className="whitespace-pre-wrap rounded-lg bg-panel-2 p-3 text-sm">{o.details}</p>}
                    {o.files.length > 0 && (
                      <div className="space-y-1">
                        {o.files.map((f) => (
                          <Row key={f} icon={FileBox}>
                            {f}
                          </Row>
                        ))}
                        <p className="text-xs text-muted">Les fichiers sont joints à l&apos;email de la demande.</p>
                      </div>
                    )}
                  </div>

                  <OrderEditor id={o.id} status={o.status} finalCents={o.final_cents} note={o.admin_note} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
