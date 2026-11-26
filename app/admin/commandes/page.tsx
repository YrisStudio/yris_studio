import PageHeader from "../PageHeader";
import OrdersBoard from "./OrdersBoard";
import { getAssignees, getMe, requireAdmin } from "@/lib/admin";
import { getAllOrders, isOpen, orderAmount } from "@/lib/orders";
import { formatPrice } from "@/lib/site";

export const metadata = { title: "Commandes" };

export default async function AdminOrders() {
  await requireAdmin();
  const [orders, people, me] = await Promise.all([getAllOrders(), getAssignees(), getMe()]);
  const open = orders.filter((o) => isOpen(o.status));
  const pipeline = open.reduce((n, o) => n + orderAmount(o), 0);

  return (
    <div>
      <PageHeader
        title="Commandes"
        description={`${open.length} en cours · ${formatPrice(pipeline)} à réaliser · ${orders.length} au total`}
      />
      <OrdersBoard orders={orders} people={people} me={me?.name ?? null} />
    </div>
  );
}
