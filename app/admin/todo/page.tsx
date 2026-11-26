import PageHeader from "../PageHeader";
import TodoView from "./TodoView";
import { getAssignees, getMe, requireAdmin } from "@/lib/admin";
import { getAllOrders, isOpen } from "@/lib/orders";
import { orderRef } from "@/lib/site";
import { getTodos } from "@/lib/todos-server";

export const metadata = { title: "To-do" };

export default async function AdminTodo() {
  await requireAdmin();
  const [todos, assignees, me, orders] = await Promise.all([getTodos(), getAssignees(), getMe(), getAllOrders()]);
  const done = todos.filter((t) => t.done).length;
  // Commandes en cours confiées à quelqu'un : elles s'affichent dans « Qui fait quoi ».
  const assignedOrders = orders
    .filter((o) => o.assigned_to && isOpen(o.status))
    .map((o) => ({
      id: o.id,
      ref: orderRef(o.id),
      title: o.product_name ?? o.details?.split("\n")[0]?.slice(0, 80) ?? "Demande sur mesure",
      customer: o.customer_name,
      status: o.status,
      due: o.due_date,
      assignee: o.assigned_to!,
    }));

  return (
    <div>
      <PageHeader title="To-do" description={`${todos.length - done} à faire · ${done} faite(s) · qui fait quoi`} />
      <TodoView todos={todos} assignees={assignees} me={me?.name ?? null} orders={assignedOrders} />
    </div>
  );
}
