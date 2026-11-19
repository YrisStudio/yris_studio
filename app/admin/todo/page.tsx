import PageHeader from "../PageHeader";
import TodoView from "./TodoView";
import { requireAdmin } from "@/lib/admin";
import { getTodos } from "@/lib/todos-server";

export const metadata = { title: "To-do" };

export default async function AdminTodo() {
  await requireAdmin();
  const todos = await getTodos();
  const done = todos.filter((t) => t.done).length;
  return (
    <div>
      <PageHeader title="To-do" description={`${todos.length - done} à faire · ${done} faite(s)`} />
      <TodoView todos={todos} />
    </div>
  );
}
