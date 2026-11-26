"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export type ModelState = { status: "idle" | "success" | "error"; message?: string };

const BUCKET = "modeles";
const refresh = () => revalidatePath("/admin/modeles");
// Chemin d'un fichier déposé par l'équipe (« <uuid>/nom.stl ») ou fichier public fourni avec le site.
const validPath = (p: string) => !p || /^[0-9a-f-]{36}\/[\w.-]{1,120}$/i.test(p) || /^\/(modeles|rendus)\/[\w.-]+$/.test(p);

export async function saveModel(_prev: ModelState, formData: FormData): Promise<ModelState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const id = get("id");
  const name = get("name").slice(0, 120);
  const filePath = get("file_path");
  const photoPath = get("photo_path");
  const minutes = Math.round(Number(get("print_hours").replace(",", ".")) * 60) || null;
  const grams = Number(get("grams").replace(",", ".")) || null;
  if (!name) return { status: "error", message: "Donne un nom au modèle." };
  if (!validPath(filePath) || !validPath(photoPath)) return { status: "error", message: "Fichier invalide." };

  const row = {
    name,
    file_path: filePath || null,
    file_size: Number(get("file_size")) || null,
    photo_path: photoPath || null,
    material: get("material").slice(0, 40) || null,
    print_minutes: minutes,
    grams,
    product_slug: get("product_slug") || null,
    notes: get("notes").slice(0, 4000) || null,
  };
  const supabase = await createClient();
  const { error } = id ? await supabase.from("models3d").update(row).eq("id", id) : await supabase.from("models3d").insert(row);
  if (error) {
    console.error("Modèle :", error.message);
    return { status: "error", message: "Impossible d'enregistrer le modèle." };
  }
  await logActivity(id ? "a modifié le modèle 3D" : "a ajouté le modèle 3D", name, "/admin/modeles");
  refresh();
  return { status: "success", message: "Modèle enregistré" };
}

export async function deleteModel(id: string) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  const { data } = await supabase.from("models3d").delete().eq("id", id).select("name, file_path, photo_path").maybeSingle();
  if (!data) return;
  // Les fichiers déposés par l'équipe partent avec la fiche ; ceux fournis avec le site restent.
  const own = [data.file_path, data.photo_path].filter((p): p is string => typeof p === "string" && !p.startsWith("/"));
  if (own.length) await supabase.storage.from(BUCKET).remove(own);
  await logActivity("a supprimé le modèle 3D", data.name, "/admin/modeles");
  refresh();
}
