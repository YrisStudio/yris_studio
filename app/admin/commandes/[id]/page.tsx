import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Download, FileText, Mail, MapPin, Package, Paperclip, Phone, Printer, Store, Truck } from "lucide-react";
import AddToQueue from "./AddToQueue";
import MetaForm from "./MetaForm";
import NoteForm from "./NoteForm";
import QuoteBuilder from "./QuoteBuilder";
import StatusBar from "./StatusBar";
import { requireAdmin } from "@/lib/admin";
import { clientKey } from "@/lib/clients";
import { getClientRecord } from "@/lib/clients-server";
import { formatHours } from "@/lib/atelier";
import { getOrderJobs } from "@/lib/atelier-server";
import { getOrder, getOrderEvents } from "@/lib/orders";
import { eventLabel, kindLabel, statusMeta } from "@/lib/orders-meta";
import { getTariffs } from "@/lib/settings";
import { formatPrice, orderRef, type OrderStatus } from "@/lib/site";

export const metadata = { title: "Commande" };

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

function Section({ title, icon: Icon, children, action }: { title: string; icon: typeof Package; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-panel">
      <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <Icon size={14} className="text-muted" aria-hidden />
        <h2 className="text-[13px] font-medium">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1 text-[13px]">
      <dt className="w-28 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{children}</dd>
    </div>
  );
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const email = order.customer_email?.trim().toLowerCase() ?? null;
  const [events, tariffs, jobs, client] = await Promise.all([
    getOrderEvents(id),
    getTariffs(),
    getOrderJobs(id),
    email ? getClientRecord(email) : Promise.resolve(null),
  ]);
  const proDiscount = client?.is_pro ? Number(client.pro_discount_pct) : 0;
  const meta = statusMeta[order.status as OrderStatus];
  const amount = order.final_cents ?? order.estimated_cents;

  return (
    <div>
      <Link href="/admin/commandes" className="mb-3 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-fg">
        <ArrowLeft size={13} aria-hidden /> Commandes
      </Link>

      {/* En-tête */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{order.product_name ?? "Demande sur mesure"}</h1>
            <span className={`rounded px-1.5 py-0.5 text-[11.5px] ${meta?.pill ?? ""}`}>{meta?.label ?? order.status}</span>
            {order.priority === "urgente" && <span className="rounded bg-red-400/15 px-1.5 py-0.5 text-[11.5px] text-red-300">Urgent</span>}
          </div>
          <p className="mt-0.5 font-mono text-[12px] text-muted">
            {orderRef(order.id)} · {kindLabel[order.kind] ?? order.kind} · reçue le {dateTime.format(new Date(order.created_at))}
            {order.quote_number && ` · devis ${order.quote_number}`}
          </p>
        </div>
        <p className="font-mono text-xl">{amount !== null ? formatPrice(amount) : <span className="text-muted">À chiffrer</span>}</p>
      </div>

      <StatusBar id={order.id} status={order.status} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {/* La demande */}
          <Section title="Demande" icon={Package}>
            <dl>
              <Row label="Type">{kindLabel[order.kind] ?? order.kind}</Row>
              {order.product_name && <Row label="Article">{order.product_name}</Row>}
              <Row label="Quantité">{order.quantity}</Row>
              <Row label="Matériau">{order.material ?? <span className="text-muted">À choisir</span>}</Row>
              {order.estimated_cents !== null && <Row label="Estimation">{formatPrice(order.estimated_cents)}</Row>}
            </dl>
            {order.details && (
              <p className="mt-3 whitespace-pre-line rounded-md border border-line bg-bg/50 p-3 text-[13px] leading-relaxed">{order.details}</p>
            )}
            {order.files.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {order.files.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 rounded border border-line px-2 py-1 font-mono text-[11.5px] text-muted">
                    <Paperclip size={11} aria-hidden /> {f}
                  </li>
                ))}
              </ul>
            )}
            {order.files.length > 0 && (
              <p className="mt-2 text-[11.5px] text-muted">Les fichiers ont été envoyés en pièce jointe sur l&apos;email de notification.</p>
            )}
          </Section>

          {/* Devis */}
          <Section
            title="Devis"
            icon={FileText}
            action={
              order.lines?.length ? (
                <Link href={`/imprimer/devis/${order.id}`} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-fg">
                  <Download size={13} aria-hidden /> PDF
                </Link>
              ) : null
            }
          >
            <QuoteBuilder
              id={order.id}
              tariffs={tariffs}
              initial={{
                label: order.product_name ?? order.quote_inputs?.label ?? "",
                material: order.quote_inputs?.material ?? (order.material as never) ?? "PLA",
                quantity: order.quote_inputs?.quantity ?? order.quantity,
                grams: order.quote_inputs?.grams ?? 0,
                hours: order.quote_inputs?.hours ?? 0,
                finishingMinutes: order.quote_inputs?.finishingMinutes ?? 15,
                delivery: order.quote_inputs?.delivery ?? order.delivery === "livraison",
                discountPct: order.quote_inputs?.discountPct ?? proDiscount,
              }}
              savedLines={order.lines}
              status={order.status}
            />
          </Section>

          {/* Impressions liées à la commande */}
          <Section title="Impression" icon={Printer}>
            {jobs.length > 0 && (
              <ul className="mb-3 divide-y divide-line rounded-md border border-line">
                {jobs.map((j) => (
                  <li key={j.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2 text-[13px]">
                    <span className="min-w-0 flex-1 truncate">{j.title}</span>
                    <span className="font-mono text-[11.5px] text-muted">{formatHours(Number(j.hours) * j.quantity)}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] ${
                        j.status === "en cours"
                          ? "bg-amber-400/15 text-amber-300"
                          : j.status === "terminé"
                            ? "bg-accent/15 text-accent"
                            : j.status === "raté"
                              ? "bg-red-400/15 text-red-300"
                              : "bg-fg/10 text-muted"
                      }`}
                    >
                      {j.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <AddToQueue id={order.id} ready={Boolean(order.quote_inputs?.hours)} />
          </Section>

          {/* Historique */}
          <Section title="Historique" icon={FileText}>
            <NoteForm id={order.id} />
            <ol className="mt-4 space-y-3 border-l border-line pl-4">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span
                    className={`absolute -left-[21px] top-1.5 size-2 rounded-full ${
                      e.kind === "note" ? "bg-amber-400" : e.kind === "devis" ? "bg-sky-400" : e.kind === "email" ? "bg-accent" : "bg-fg/40"
                    }`}
                    aria-hidden
                  />
                  <p className="text-[11.5px] text-muted">
                    <span className="font-medium text-fg/80">{eventLabel[e.kind]}</span> · {dateTime.format(new Date(e.created_at))}
                    {e.author_email && ` · ${e.author_email.split("@")[0]}`}
                  </p>
                  <p className="whitespace-pre-line text-[13px]">{e.body}</p>
                </li>
              ))}
              <li className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-fg/40" aria-hidden />
                <p className="text-[11.5px] text-muted">
                  <span className="font-medium text-fg/80">{eventLabel.creation}</span> · {dateTime.format(new Date(order.created_at))}
                </p>
                <p className="text-[13px]">Demande envoyée depuis le site.</p>
              </li>
            </ol>
            {order.admin_note && (
              <p className="mt-4 rounded-md border border-line bg-bg/50 p-3 text-[12.5px] text-muted">
                <span className="font-medium text-fg/80">Ancienne note :</span> {order.admin_note}
              </p>
            )}
          </Section>
        </div>

        {/* Colonne de droite */}
        <aside className="space-y-4">
          <Section title="Client" icon={Building2}>
            {email ? (
              <Link href={`/admin/clients/${clientKey(email)}`} className="text-[14px] font-medium hover:text-accent">
                {order.customer_name ?? "Client"} →
              </Link>
            ) : (
              <p className="text-[14px] font-medium">{order.customer_name ?? "Client"}</p>
            )}
            {client?.is_pro && (
              <p className="mt-1 inline-block rounded bg-sky-400/15 px-1.5 py-0.5 text-[11.5px] text-sky-300">
                Client pro{proDiscount ? ` · remise ${proDiscount} %` : ""}
              </p>
            )}
            {client && client.tags.length > 0 && <p className="mt-1 text-[11.5px] text-muted">{client.tags.join(" · ")}</p>}
            {order.customer_company && <p className="text-[12.5px] text-muted">{order.customer_company}</p>}
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {order.customer_email && (
                <li>
                  <a href={`mailto:${order.customer_email}?subject=${encodeURIComponent(`Votre commande ${orderRef(order.id)}`)}`} className="flex items-center gap-2 hover:text-accent">
                    <Mail size={13} className="text-muted" aria-hidden />
                    <span className="truncate">{order.customer_email}</span>
                  </a>
                </li>
              )}
              {order.phone && (
                <li>
                  <a href={`tel:${order.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-accent">
                    <Phone size={13} className="text-muted" aria-hidden /> {order.phone}
                  </a>
                </li>
              )}
              <li className="flex items-start gap-2">
                {order.delivery === "livraison" ? (
                  <Truck size={13} className="mt-0.5 text-muted" aria-hidden />
                ) : (
                  <Store size={13} className="mt-0.5 text-muted" aria-hidden />
                )}
                <span>{order.delivery === "livraison" ? "Livraison" : order.delivery === "retrait" ? "Retrait à l'atelier" : "Mode de remise à définir"}</span>
              </li>
              {(order.address || order.city) && (
                <li className="flex items-start gap-2">
                  <MapPin size={13} className="mt-0.5 text-muted" aria-hidden />
                  <span>
                    {order.address}
                    {order.address && <br />}
                    {[order.postal_code, order.city].filter(Boolean).join(" ")}
                  </span>
                </li>
              )}
            </ul>
            <p className="mt-3 text-[11.5px] text-muted">{order.user_id ? "A un compte client" : "Commande sans compte"}</p>
          </Section>

          <Section title="Suivi" icon={Package}>
            <MetaForm
              id={order.id}
              priority={order.priority ?? "normale"}
              dueDate={order.due_date}
              finalCents={order.final_cents}
            />
          </Section>
        </aside>
      </div>
    </div>
  );
}
