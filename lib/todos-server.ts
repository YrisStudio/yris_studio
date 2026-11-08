import { createClient } from "@/lib/supabase/server";
import type { Todo } from "@/lib/todos";

// Toutes les tâches : à faire d'abord (urgentes en tête), puis les faites.
export async function getTodos(): Promise<Todo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_todos")
    .select("id, category, title, details, priority, done, done_at, created_at")
    .order("done")
    .order("priority")
    .order("created_at");
  if (error) console.error("To-do :", error.message);
  return (data ?? []) as Todo[];
}
