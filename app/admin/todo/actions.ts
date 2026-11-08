"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { todoCategories } from "@/lib/todos";
import { createClient } from "@/lib/supabase/server";

export type TodoState = { status: "idle" | "success" | "error"; message?: string };

function refresh() {
  revalidatePath("/admin", "layout");
}

export async function addTodo(_prev: TodoState, formData: FormData): Promise<TodoState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const details = String(formData.get("details") ?? "").trim().slice(0, 2000);
  const category = String(formData.get("category") ?? "");
  const priority = Number(formData.get("priority"));

  if (!title) return { status: "error", message: "Écrivez la tâche." };
  if (!(todoCategories as readonly string[]).includes(category)) return { status: "error", message: "Choisissez une catégorie." };
  if (![1, 2, 3].includes(priority)) return { status: "error", message: "Choisissez une priorité." };

  const supabase = await createClient();
  const { error } = await supabase.from("admin_todos").insert({ title, details: details || null, category, priority });
  if (error) {
    console.error("To-do :", error.message);
    return { status: "error", message: "Impossible d'enregistrer la tâche." };
  }
  refresh();
  return { status: "success", message: "Tâche ajoutée." };
}

export async function setTodoDone(id: string, done: boolean) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_todos")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
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
