"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, LoaderCircle, Star, X } from "lucide-react";
import { makeCover, removePhoto, uploadPhoto } from "../actions";

// Réduit la photo dans le navigateur (1600 px de large max, WebP) : envoi rapide même depuis un téléphone.
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.85));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
}

export default function PhotoManager({ id, photos }: { id: string; photos: { path: string; url: string }[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function upload(list: FileList | null) {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setError(null);
    start(async () => {
      for (const [i, f] of files.entries()) {
        setProgress(`Envoi ${i + 1}/${files.length}…`);
        const fd = new FormData();
        try {
          fd.append("photo", await shrink(f));
        } catch {
          fd.append("photo", f);
        }
        const res = await uploadPhoto(id, fd);
        if (res.status === "error") {
          setError(res.message ?? "Envoi impossible.");
          break;
        }
      }
      setProgress(null);
      if (input.current) input.current.value = "";
      if (camera.current) camera.current.value = "";
      router.refresh();
    });
  }

  const act = (fn: () => Promise<{ status: string; message?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.status === "error") setError(res.message ?? "Erreur.");
      router.refresh();
    });

  return (
    <div>
      <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.path} className="group relative overflow-hidden rounded-md border border-line bg-bg">
            {/* eslint-disable-next-line @next/next/no-img-element -- photo Supabase Storage */}
            <img src={p.url} alt="" className="aspect-square w-full object-cover" />
            {i === 0 ? (
              <span className="absolute left-1.5 top-1.5 rounded bg-accent px-1.5 py-0.5 text-[10.5px] font-medium text-on-accent">Couverture</span>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => act(() => makeCover(id, p.path))}
                title="Mettre en couverture"
                aria-label="Mettre en couverture"
                className="absolute left-1.5 top-1.5 rounded bg-black/60 p-1 text-white hover:bg-black/80"
              >
                <Star size={13} />
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => confirm("Retirer cette photo ?") && act(() => removePhoto(id, p.path))}
              title="Retirer la photo"
              aria-label="Retirer la photo"
              className="absolute right-1.5 top-1.5 rounded bg-black/60 p-1 text-white hover:bg-red-600"
            >
              <X size={13} />
            </button>
          </li>
        ))}
        {photos.length < 8 && (
          <li>
            <button
              type="button"
              disabled={pending}
              onClick={() => input.current?.click()}
              className="grid aspect-square w-full place-items-center rounded-md border border-dashed border-line text-[12px] text-muted hover:border-accent hover:text-fg disabled:opacity-60"
            >
              <span className="grid justify-items-center gap-1">
                {pending ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <ImagePlus size={18} aria-hidden />}
                {progress ?? "Ajouter"}
              </span>
            </button>
          </li>
        )}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {/* Sur téléphone : ouvre directement l'appareil photo. */}
        <button
          type="button"
          disabled={pending || photos.length >= 8}
          onClick={() => camera.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[12.5px] text-fg/85 hover:text-fg disabled:opacity-50 sm:hidden"
        >
          <Camera size={14} aria-hidden /> Prendre une photo
        </button>
        <p className="text-[11.5px] text-muted">8 photos maximum. La première sert de couverture sur la boutique.</p>
        {error && (
          <p role="alert" className="text-[12.5px] text-red-300">
            {error}
          </p>
        )}
      </div>

      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple hidden onChange={(e) => upload(e.target.files)} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => upload(e.target.files)} />
    </div>
  );
}
