import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, Mail, MapPin, Phone, ShoppingBag, StickyNote, UserRound } from "lucide-react";
import ClientForm from "./ClientForm";
import ClientNotes from "./ClientNotes";
import TagEditor from "./TagEditor";
import { requireAdmin } from "@/lib/admin";
import { buildClients } from "@/lib/clients";
import { getAccounts, getClientNotes, getClientRecord } from "@/lib/clients-server";
import { getAllOrders } from "@/lib/orders";
import { kindLabel, statusMeta } from "@/lib/orders-meta";
import { formatPrice, orderRef, type OrderStatus } from "@/lib/site";

export const metadata = { title: "Client" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Mail; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-panel">
      <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <Icon size={14} className="text-muted" aria-hidden />
        <h2 className="text-[13px] font-medium">{title}</h2>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default async function ClientPage({ params }: { params: Promise<{ key: string }> }) {
  await requireAdmin();
  const email = decodeURIComponent((await params).key).trim().toLowerCase();
  const [allOrders, record, accounts, notes] = await Promise.all([getAllOrders(), getClientRecord(email), getAccounts(), getClientNotes(email)]);
  const orders = allOrders.filter((o) => o.customer_email?.trim().toLowerCase() === email);
  const client = buildClients(orders, record ? [record] : [], accounts.filter((a) => a.email === email)).find((c) => c.email === email);
  if (!client) notFound();

  const done = orders.filter((o) => o.status === "terminée");
  const average = done.length ? Math.round(client.spentCents / done.length) : 0;
  const last = orders[0];

  return (
    <div>
      <Link href="/admin/clients" className="mb-3 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-fg">
        <ArrowLeft size={13} aria-hidden /> Clients
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className={`grid size-11 place-items-center rounded-full text-[16px] font-semibold ${client.isPro ? "bg-sky-400/15 text-sky-300" : "bg-fg/10"}`}>
          {client.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            {client.name}
            {client.isPro && (
              <span className="inline-flex items-center gap-1 rounded bg-sky-400/15 px-1.5 py-0.5 text-[11.5px] font-normal text-sky-300">
                <Briefcase size={11} aria-hidden /> Pro{client.proDiscountPct ? ` · −${client.proDiscountPct} %` : ""}
              </span>
            )}
          </h1>
          <p className="text-[12.5px] text-muted">
            {[client.company, client.email].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {/* Chiffres */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Commandes", String(client.orders), client.open ? `${client.open} en cours` : "aucune en cours"],
          ["Dépensé", formatPrice(client.spentCents), `${done.length} terminée(s)`],
          ["Panier moyen", done.length ? formatPrice(average) : "—", "commandes terminées"],
          ["Client depuis", client.firstOrder ? dateFmt.format(new Date(client.firstOrder)) : client.accountSince ? dateFmt.format(new Date(client.accountSince)) : "—", client.hasAccount ? "a un compte" : "sans compte"],
        ].map(([k, v, n]) => (
          <div key={k} className="rounded-lg border border-line bg-panel px-3 py-2.5">
            <p className="text-[11.5px] text-muted">{k}</p>
            <p className="mt-0.5 font-mono text-[17px]">{v}</p>
            <p className="text-[11px] text-muted">{n}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <Section title={`Commandes (${orders.length})`} icon={ShoppingBag}>
            {orders.length === 0 ? (
              <p className="text-[13px] text-muted">Pas encore de commande.</p>
            ) : (
              <ul className="divide-y divide-line">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/commandes/${o.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2 text-[13px] hover:text-accent">
                      <span className="font-mono text-[11.5px] text-muted">{orderRef(o.id)}</span>
                      <span className="min-w-0 flex-1 truncate">{o.product_name ?? o.details?.split("\n")[0] ?? kindLabel[o.kind]}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[11px] ${statusMeta[o.status as OrderStatus]?.pill ?? ""}`}>
                        {statusMeta[o.status as OrderStatus]?.label ?? o.status}
                      </span>
                      <span className="w-20 text-right font-mono">{formatPrice(o.final_cents ?? o.estimated_cents)}</span>
                      <span className="w-20 text-right text-[11.5px] text-muted">{dateFmt.format(new Date(o.created_at))}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Notes internes" icon={StickyNote}>
            <ClientNotes email={client.email} notes={notes} />
          </Section>
        </div>

        <aside className="space-y-4">
          <Section title="Contact" icon={UserRound}>
            <ul className="space-y-1.5 text-[13px]">
              <li>
                <a href={`mailto:${client.email}`} className="flex items-center gap-2 hover:text-accent">
                  <Mail size={13} className="text-muted" aria-hidden />
                  <span className="truncate">{client.email}</span>
                </a>
              </li>
              {client.phone && (
                <li>
                  <a href={`tel:${client.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-accent">
                    <Phone size={13} className="text-muted" aria-hidden /> {client.phone}
                  </a>
                </li>
              )}
              {last?.city && (
                <li className="flex items-start gap-2">
                  <MapPin size={13} className="mt-0.5 text-muted" aria-hidden />
                  <span>
                    {last.address && (
                      <>
                        {last.address}
                        <br />
                      </>
                    )}
                    {[last.postal_code, last.city].filter(Boolean).join(" ")}
                  </span>
                </li>
              )}
            </ul>
            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-1.5 text-[11.5px] text-muted">Étiquettes</p>
              <TagEditor email={client.email} tags={client.tags} />
            </div>
          </Section>

          <Section title="Fiche" icon={Briefcase}>
            <ClientForm
              email={client.email}
              name={record?.name ?? client.name}
              company={client.company}
              phone={client.phone}
              isPro={client.isPro}
              discount={client.proDiscountPct}
            />
          </Section>
        </aside>
      </div>
    </div>
  );
}
