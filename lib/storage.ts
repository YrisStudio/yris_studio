// Liens publics des fichiers rangés dans un espace de stockage public (photos des réalisations).
export const REALISATIONS_BUCKET = "realisations";

export const publicUrl = (bucket: string, path: string) =>
  path.startsWith("http") ? path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;

export const realisationUrl = (path: string) => publicUrl(REALISATIONS_BUCKET, path);

// Réduit une photo dans le navigateur (1600 px max, WebP) avant l'envoi : rapide même en 4G.
export async function shrinkImage(file: File, max = 1600): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}
