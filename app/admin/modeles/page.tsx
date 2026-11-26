import PageHeader from "../PageHeader";
import ModelsView, { type Model3D } from "./ModelsView";
import { requireAdmin } from "@/lib/admin";
import { getProducts } from "@/lib/products";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Modèles 3D" };

// Bibliothèque des fichiers 3D de l'atelier : rangés, réutilisables, avec photo et réglages d'impression.
export default async function ModelsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data }, products] = await Promise.all([supabase.from("models3d").select("*").order("name"), getProducts()]);
  const rows = (data ?? []) as Omit<Model3D, "fileUrl" | "photoUrl">[];

  // Liens temporaires (1 h) pour les fichiers privés ; les fichiers fournis avec le site sont publics.
  const privatePaths = rows.flatMap((r) => [r.file_path, r.photo_path]).filter((p): p is string => typeof p === "string" && !p.startsWith("/"));
  const signed = new Map<string, string>();
  if (privatePaths.length) {
    const { data: urls } = await supabase.storage.from("modeles").createSignedUrls(privatePaths, 3600);
    urls?.forEach((u) => u.path && u.signedUrl && signed.set(u.path, u.signedUrl));
  }
  const url = (p: string | null) => (!p ? null : p.startsWith("/") ? p : (signed.get(p) ?? null));
  const models: Model3D[] = rows.map((r) => ({ ...r, fileUrl: url(r.file_path), photoUrl: url(r.photo_path) }));

  return (
    <div>
      <PageHeader title="Modèles 3D" description={`${models.length} fichier${models.length > 1 ? "s" : ""} · STL, 3MF ou OBJ, jusqu'à 50 Mo`} />
      <ModelsView models={models} products={products.map((p) => ({ slug: p.slug, name: p.name }))} />
    </div>
  );
}
