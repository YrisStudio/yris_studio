import PageHeader from "../PageHeader";
import ClientsList from "./ClientsList";
import { requireAdmin } from "@/lib/admin";
import { buildClients } from "@/lib/clients";
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

  return (
    <div>
      <PageHeader
        title="Clients"
        description={`${clients.length} client(s) · ${buyers} ont commandé · ${formatPrice(spent)} encaissés au total`}
      />
      <ClientsList clients={clients} nowIso={new Date().toISOString()} />
    </div>
  );
}
