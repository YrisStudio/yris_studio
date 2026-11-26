import PageHeader from "../PageHeader";
import ClientsList from "./ClientsList";
import WinBack from "./WinBack";
import { requireAdmin } from "@/lib/admin";
import { buildClients, clientKey } from "@/lib/clients";
import { createClient } from "@/lib/supabase/server";
import { getAccounts, getClientRecords } from "@/lib/clients-server";
import { getAllOrders } from "@/lib/orders";
import { formatPrice } from "@/lib/site";

export const metadata = { title: "Clients" };

export default async function AdminClients() {
  await requireAdmin();
  const [orders, records, accounts] = await Promise.all([getAllOrders(), getClientRecords(), getAccounts()]);
  const clients = buildClients(orders, records, accounts);
  const spent = clients.reduce((n, c) => n + c.spentCents, 0);
  const buyers = clients.filter((c) => c.orders > 0).length;

  // À relancer : ont commandé, rien en cours, dernière commande il y a plus de 4 mois.
  const limit = new Date().getTime() - 120 * 86_400_000;
  const supabase = await createClient();
  const { data: notes } = await supabase.from("client_notes").select("client_email, created_at").like("body", "Relance envoyée%").order("created_at", { ascending: false });
  const relanced = new Map<string, string>();
  for (const n of notes ?? []) if (!relanced.has(n.client_email)) relanced.set(n.client_email, n.created_at);
  const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const toWinBack = clients
    .filter((c) => c.orders > 0 && c.open === 0 && c.lastOrder && new Date(c.lastOrder).getTime() < limit)
    .slice(0, 30)
    .map((c) => ({
      email: c.email,
      name: c.company ?? c.name,
      key: clientKey(c.email),
      lastOrder: day(c.lastOrder!),
      spent: formatPrice(c.spentCents),
      relancedAt: relanced.has(c.email) ? day(relanced.get(c.email)!) : null,
    }));

  return (
    <div>
      <PageHeader
        title="Clients"
        description={`${clients.length} client(s) · ${buyers} ont commandé · ${formatPrice(spent)} encaissés au total`}
      />
      <section className="mb-4 rounded-lg border border-line bg-panel">
        <h2 className="border-b border-line px-4 py-2.5 text-[13px] font-medium">
          À relancer <span className="font-mono text-[11px] text-muted">{toWinBack.length}</span>
        </h2>
        <WinBack rows={toWinBack} />
      </section>
      <ClientsList clients={clients} nowIso={new Date().toISOString()} />
    </div>
  );
}
