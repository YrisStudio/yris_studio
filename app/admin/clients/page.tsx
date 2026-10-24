import { Mail, Phone } from "lucide-react";
import PageHeader from "../PageHeader";
import { requireAdmin } from "@/lib/admin";
import { getAllOrders, isOpen, orderAmount } from "@/lib/orders";
import { formatPrice } from "@/lib/site";

export const metadata = { title: "Clients" };

type Client = {
  key: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  hasAccount: boolean;
  orders: number;
  open: number;
  spent: number;
  last: string;
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminClients() {
  await requireAdmin();
  const orders = await getAllOrders();

  // On regroupe les commandes par client (email, sinon compte).
  const map = new Map<string, Client>();
  for (const o of orders) {
    const key = o.customer_email?.toLowerCase() ?? o.user_id ?? o.id;
    const c =
      map.get(key) ??
      ({
        key,
        name: o.customer_name ?? "Client",
        email: o.customer_email ?? "",
        phone: null,
        city: null,
        hasAccount: false,
        orders: 0,
        open: 0,
        spent: 0,
        last: o.created_at,
      } satisfies Client);
    c.orders += 1;
    if (isOpen(o.status)) c.open += 1;
    if (o.status === "terminée") c.spent += orderAmount(o);
    c.phone ??= o.phone;
    c.city ??= o.city;
    c.hasAccount ||= Boolean(o.user_id);
    if (o.created_at > c.last) c.last = o.created_at;
    map.set(key, c);
  }
  const clients = [...map.values()].sort((a, b) => b.last.localeCompare(a.last));

  return (
    <div>
      <PageHeader
        title="Clients"
        description={`${clients.length} client(s) ayant passé au moins une commande ou demande.`}
      />

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong p-12 text-center text-sm text-muted">
          Pas encore de client.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-muted">
                <th className="px-5 py-3 font-normal">Client</th>
                <th className="px-5 py-3 font-normal">Contact</th>
                <th className="px-5 py-3 font-normal">Ville</th>
                <th className="px-5 py-3 text-right font-normal">Commandes</th>
                <th className="px-5 py-3 text-right font-normal">Dépensé</th>
                <th className="px-5 py-3 text-right font-normal">Dernière</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {clients.map((c) => (
                <tr key={c.key} className="transition-colors hover:bg-panel-2">
                  <td className="px-5 py-4">
                    <p className="font-medium">{c.name}</p>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                      {c.hasAccount ? "compte client" : "sans compte"}
                    </span>
                  </td>
                  <td className="space-y-1 px-5 py-4">
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-accent hover:underline">
                        <Mail size={13} aria-hidden />
                        {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-muted hover:text-fg">
                        <Phone size={13} aria-hidden />
                        {c.phone}
                      </a>
                    )}
                  </td>
                  <td className="px-5 py-4 text-muted">{c.city ?? "—"}</td>
                  <td className="px-5 py-4 text-right font-mono">
                    {c.orders}
                    {c.open > 0 && <span className="ml-1.5 text-accent">({c.open} en cours)</span>}
                  </td>
                  <td className="px-5 py-4 text-right font-mono">{formatPrice(c.spent)}</td>
                  <td className="px-5 py-4 text-right font-mono text-muted">{dateFmt.format(new Date(c.last))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
