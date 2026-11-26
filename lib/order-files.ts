import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Fichiers joints aux demandes (STL, 3MF, photos…), rangés par commande : demandes/<id commande>/<nom>.
export const ORDER_FILES_BUCKET = "demandes";

// Nom de fichier sûr pour le stockage, en gardant l'extension ; les doublons reçoivent un suffixe.
export function storageNames(files: File[]) {
  const seen = new Set<string>();
  return files.map((f) => {
    const dot = f.name.lastIndexOf(".");
    const ext = dot > 0 ? f.name.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, "") : "";
    const base =
      (dot > 0 ? f.name.slice(0, dot) : f.name)
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^\w-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80) || "fichier";
    let name = `${base}${ext}`;
    for (let i = 2; seen.has(name); i++) name = `${base}-${i}${ext}`;
    seen.add(name);
    return name;
  });
}

// Dépose les fichiers d'une demande. Le visiteur n'a aucun droit sur ce stockage : c'est le serveur
// (clé secrète) qui écrit. Sans la clé (en local), les fichiers partent seulement par email.
export async function storeOrderFiles(orderId: string, files: File[], names: string[]) {
  if (!files.length || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const storage = createServiceClient().storage.from(ORDER_FILES_BUCKET);
  const results = await Promise.all(
    files.map((f, i) =>
      storage.upload(`${orderId}/${names[i]}`, f, { contentType: f.type || "application/octet-stream", upsert: true }),
    ),
  );
  const failed = results.filter((r) => r.error);
  if (failed.length) console.error("Fichiers de la demande :", failed.map((r) => r.error?.message).join(", "));
  return failed.length === 0;
}

export type OrderFile = { name: string; url: string | null; kind: "3d" | "image" | "autre" };

const kindOf = (name: string): OrderFile["kind"] =>
  /\.(stl|3mf|obj)$/i.test(name) ? "3d" : /\.(jpe?g|png|webp|gif)$/i.test(name) ? "image" : "autre";

// Liens temporaires (1 h) vers les fichiers d'une commande, pour l'équipe. Les anciennes demandes,
// dont les fichiers n'ont été envoyés que par email, renvoient url: null.
export async function getOrderFiles(orderId: string, names: string[]): Promise<OrderFile[]> {
  if (!names.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage.from(ORDER_FILES_BUCKET).createSignedUrls(
    names.map((n) => `${orderId}/${n}`),
    3600,
  );
  return names.map((name, i) => ({ name, url: data?.[i]?.error ? null : (data?.[i]?.signedUrl ?? null), kind: kindOf(name) }));
}
