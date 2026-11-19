import PageHeader from "../PageHeader";
import OrdersBoard from "./OrdersBoard";
import { requireAdmin } from "@/lib/admin";
import { getAllOrders, isOpen, orderAmount } from "@/lib/orders";
import { formatPrice } from "@/lib/site";

export const metadata = { title: "Commandes" };

export default async function AdminOrders() {
  await requireAdmin();
  const orders = await getAllOrders();
  const open = orders.filter((o) => isOpen(o.status));
  const pipeline = open.reduce((n, o) => n + orderAmount(o), 0);

  return (
    <div>
      <PageHeader
        title="Commandes"
        description={`${open.length} en cours · ${formatPrice(pipeline)} à réaliser · ${orders.length} au total`}
      />
      <OrdersBoard orders={orders} />
    </div>
  );
}
