"use server";

import { revalidatePath } from "next/cache";
import { getAssignees, isAdmin } from "@/lib/admin";
import { todoCategories } from "@/lib/todos";
import { createClient } from "@/lib/supabase/server";

export type TodoState = { status: "idle" | "success" | "error"; message?: string };

const refresh = () => revalidatePath("/admin/todo");
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Prénom choisi dans la liste de l'équipe, ou personne.
async function validAssignee(who: string) {
  if (!who) return null;
  return (await getAssignees()).includes(who) ? who : undefined;
}

export async function addTodo(_prev: TodoState, formData: FormData): Promise<TodoState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const details = String(formData.get("details") ?? "").trim().slice(0, 2000);
  const category = String(formData.get("category") ?? "");
  const priority = Number(formData.get("priority"));
  const assignee = await validAssignee(String(formData.get("assigned_to") ?? ""));
  const due = String(formData.get("due_date") ?? "");

  if (!title) return { status: "error", message: "Écrivez la tâche." };
  if (!(todoCategories as readonly string[]).includes(category)) return { status: "error", message: "Choisissez une catégorie." };
  if (![1, 2, 3].includes(priority)) return { status: "error", message: "Choisissez une priorité." };
  if (assignee === undefined) return { status: "error", message: "Personne inconnue dans l'équipe." };
  if (due && !DATE_RE.test(due)) return { status: "error", message: "Date invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("admin_todos").insert({ title, details: details || null, category, priority, assigned_to: assignee, due_date: due || null });
  if (error) {
    console.error("To-do :", error.message);
    return { status: "error", message: "Impossible d'enregistrer la tâche." };
  }
  refresh();
  return { status: "success", message: "Tâche ajoutée" };
}

export async function setTodoDone(id: string, done: boolean) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  const { error } = await supabase.from("admin_todos").update({ done, done_at: done ? new Date().toISOString() : null }).eq("id", id);
  if (error) console.error("To-do :", error.message);
  refresh();
}

export async function setTodoPriority(id: string, priority: 1 | 2 | 3) {
  if (!(await isAdmin()) || ![1, 2, 3].includes(priority)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("admin_todos").update({ priority }).eq("id", id);
  if (error) console.error("To-do :", error.message);
  refresh();
}

export async function deleteTodo(id: string) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  const { error } = await supabase.from("admin_todos").delete().eq("id", id);
  if (error) console.error("To-do :", error.message);
  refresh();
}

export async function setTodoAssignee(id: string, who: string) {
  if (!(await isAdmin())) return;
  const assignee = await validAssignee(who);
  if (assignee === undefined) return;
  const supabase = await createClient();
  const { error } = await supabase.from("admin_todos").update({ assigned_to: assignee }).eq("id", id);
  if (error) console.error("To-do :", error.message);
  refresh();
}

export async function setTodoDue(id: string, due: string) {
  if (!(await isAdmin()) || (due && !DATE_RE.test(due))) return;
  const supabase = await createClient();
  const { error } = await supabase.from("admin_todos").update({ due_date: due || null }).eq("id", id);
  if (error) console.error("To-do :", error.message);
  refresh();
}
