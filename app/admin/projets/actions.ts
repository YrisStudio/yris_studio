"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { getAssignees, isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export type ProjectState = { status: "idle" | "success" | "error"; message?: string };
export type Step = { text: string; done: boolean };

const STATUSES = ["idée", "en cours", "terminé"] as const;
const refresh = () => revalidatePath("/admin/projets");

const cleanSteps = (raw: unknown): Step[] =>
  (Array.isArray(raw) ? raw : [])
    .map((s) => ({ text: String((s as Step)?.text ?? "").trim().slice(0, 200), done: Boolean((s as Step)?.done) }))
    .filter((s) => s.text)
    .slice(0, 30);

export async function saveProject(_prev: ProjectState, formData: FormData): Promise<ProjectState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const id = get("id");
  const title = get("title").slice(0, 200);
  const who = get("assigned_to");
  const due = get("due_date");
  if (!title) return { status: "error", message: "Donne un nom au projet." };
  if (who && !(await getAssignees()).includes(who)) return { status: "error", message: "Personne inconnue." };
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return { status: "error", message: "Date invalide." };
  let steps: Step[] = [];
  try {
    steps = cleanSteps(JSON.parse(get("steps") || "[]"));
  } catch {
    steps = [];
  }

  const row = {
    title,
    description: get("description").slice(0, 4000) || null,
    assigned_to: who || null,
    due_date: due || null,
    steps,
    updated_at: new Date().toISOString(),
  };
  const supabase = await createClient();
  const { error } = id ? await supabase.from("projects").update(row).eq("id", id) : await supabase.from("projects").insert(row);
  if (error) {
    console.error("Projet :", error.message);
    return { status: "error", message: "Impossible d'enregistrer le projet." };
  }
  await logActivity(id ? "a modifié le projet" : "a créé le projet", title, "/admin/projets");
  refresh();
  return { status: "success", message: "Projet enregistré" };
}

export async function moveProject(id: string, status: string) {
  if (!(await isAdmin()) || !(STATUSES as readonly string[]).includes(status)) return;
  const supabase = await createClient();
  const { data } = await supabase.from("projects").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select("title").maybeSingle();
  if (data) await logActivity(`a passé le projet en « ${status} »`, data.title, "/admin/projets");
  refresh();
}

export async function toggleStep(id: string, index: number) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("steps").eq("id", id).maybeSingle();
  const steps = cleanSteps(data?.steps);
  if (!steps[index]) return;
  steps[index].done = !steps[index].done;
  await supabase.from("projects").update({ steps, updated_at: new Date().toISOString() }).eq("id", id);
  refresh();
}

export async function deleteProject(id: string) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  const { data } = await supabase.from("projects").delete().eq("id", id).select("title").maybeSingle();
  if (data) await logActivity("a supprimé le projet", data.title, "/admin/projets");
  refresh();
}
