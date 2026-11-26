"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { isAdmin } from "@/lib/admin";
import { PHOTO_BUCKET } from "@/lib/products";
import { categories, type Category } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export type ProductState = { status: "idle" | "success" | "error"; message?: string; id?: string };

const refresh = (slug?: string) => {
  revalidatePath("/admin/produits", "layout");
  revalidatePath("/boutique", "layout");
  revalidatePath("/");
  if (slug) revalidatePath(`/boutique/${slug}`);
};

// « Support téléphone » → « support-telephone ».
const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

// « 12,50 » → 1250 centimes ; vide → null (sur devis).
const euros = (v: string) => {
  const t = v.replace(/\s|€/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};

export async function saveProduct(_prev: ProductState, formData: FormData): Promise<ProductState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const id = get("id");
  const name = get("name").slice(0, 80);
  const slug = slugify(get("slug") || name) || "article";
  const category = get("category") as Category;
  const price = euros(get("price"));
  const colors = [...new Set(get("colors").split(/[,\n]/).map((c) => c.trim()).filter(Boolean))].slice(0, 12);
  const leadDays = Math.min(Math.max(parseInt(get("lead_days")) || 0, 0), 60);
  const position = parseInt(get("position")) || 0;

  if (name.length < 2) return { status: "error", message: "Donne un nom à l'article." };
  if (!categories.includes(category)) return { status: "error", message: "Choisis une catégorie." };
  if (Number.isNaN(price)) return { status: "error", message: "Prix invalide (ex. 12,50), ou laisse vide pour « sur devis »." };

  const row = {
    name,
    slug,
    category,
    price_cents: price,
    material: get("material").slice(0, 40) || "PLA",
    summary: get("summary").slice(0, 200),
    description: get("description").slice(0, 4000),
    colors,
    lead_days: leadDays,
    position,
    active: formData.get("active") === "on",
    featured: formData.get("featured") === "on",
    // Pièces déjà imprimées, prêtes à partir (expédiées sans délai de fabrication).
    stock_qty: Math.min(Math.max(parseInt(get("stock_qty")) || 0, 0), 9999),
    collections: formData
      .getAll("collections")
      .map((c) => String(c))
      .filter((c) => /^[a-z0-9-]{2,60}$/.test(c))
      .slice(0, 10),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createClient();
  const res = id
    ? await supabase.from("products").update(row).eq("id", id).select("id").single()
    : await supabase.from("products").insert(row).select("id").single();
  if (res.error) {
    if (res.error.code === "23505") return { status: "error", message: `L'adresse « ${slug} » est déjà prise par un autre article.` };
    console.error("Produit :", res.error.message);
    return { status: "error", message: "Impossible d'enregistrer l'article." };
  }
  refresh(slug);
  await logActivity(id ? "a modifié l'article" : "a créé l'article", name, `/admin/produits/${res.data.id}`);
  return { status: "success", message: id ? "Article enregistré." : "Article créé.", id: res.data.id };
}

export async function deleteProduct(id: string): Promise<ProductState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("photos").eq("id", id).single();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { status: "error", message: "Impossible de supprimer l'article." };
  if (data?.photos?.length) await supabase.storage.from(PHOTO_BUCKET).remove(data.photos);
  refresh();
  return { status: "success", message: "Article supprimé." };
}

async function getPhotos(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("photos, slug").eq("id", id).single();
  return { supabase, photos: (data?.photos ?? []) as string[], slug: data?.slug as string | undefined };
}

// Une photo à la fois (déjà réduite par le navigateur), ajoutée à la fin de la liste.
export async function uploadPhoto(id: string, formData: FormData): Promise<ProductState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const file = formData.get("photo");
  if (!(file instanceof File) || !file.size) return { status: "error", message: "Aucune photo reçue." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { status: "error", message: "Format accepté : JPG, PNG ou WebP." };
  if (file.size > 4 * 1024 * 1024) return { status: "error", message: "Photo trop lourde (4 Mo maximum)." };

  const { supabase, photos, slug } = await getPhotos(id);
  if (photos.length >= 8) return { status: "error", message: "8 photos maximum par article." };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${id}/${Date.now().toString(36)}.${ext}`;
  const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (up.error) {
    console.error("Photo :", up.error.message);
    return { status: "error", message: "Envoi de la photo impossible." };
  }
  const { error } = await supabase.from("products").update({ photos: [...photos, path] }).eq("id", id);
  if (error) return { status: "error", message: "Photo envoyée mais pas enregistrée sur l'article." };
  refresh(slug);
  return { status: "success" };
}

export async function removePhoto(id: string, path: string): Promise<ProductState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const { supabase, photos, slug } = await getPhotos(id);
  if (!photos.includes(path)) return { status: "error", message: "Photo introuvable." };
  const { error } = await supabase.from("products").update({ photos: photos.filter((p) => p !== path) }).eq("id", id);
  if (error) return { status: "error", message: "Impossible de retirer la photo." };
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  refresh(slug);
  return { status: "success" };
}

// Met la photo en couverture (première de la liste).
export async function makeCover(id: string, path: string): Promise<ProductState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const { supabase, photos, slug } = await getPhotos(id);
  if (!photos.includes(path)) return { status: "error", message: "Photo introuvable." };
  const { error } = await supabase.from("products").update({ photos: [path, ...photos.filter((p) => p !== path)] }).eq("id", id);
  if (error) return { status: "error", message: "Impossible de changer la couverture." };
  refresh(slug);
  return { status: "success" };
}

// ── Collections de la boutique ───────────────────────────────────────────────
export async function saveCollection(_prev: ProductState, formData: FormData): Promise<ProductState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const description = String(formData.get("description") ?? "").trim().slice(0, 500);
  const slug = slugify(name);
  if (!name || slug.length < 2) return { status: "error", message: "Donne un nom à la collection." };
  const supabase = await createClient();
  const { error } = await supabase.from("collections").upsert({ slug, name, description: description || null });
  if (error) return { status: "error", message: "Impossible d'enregistrer la collection." };
  await logActivity("a créé la collection", name, "/admin/produits");
  refresh();
  return { status: "success", message: "Collection enregistrée" };
}

export async function deleteCollection(slug: string): Promise<ProductState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const supabase = await createClient();
  await supabase.from("collections").delete().eq("slug", slug);
  // On retire aussi la collection des articles qui la portaient.
  const { data } = await supabase.from("products").select("id, collections").contains("collections", [slug]);
  for (const p of data ?? []) await supabase.from("products").update({ collections: (p.collections as string[]).filter((c) => c !== slug) }).eq("id", p.id);
  refresh();
  return { status: "success" };
}
