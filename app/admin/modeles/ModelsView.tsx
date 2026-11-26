"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Box, Clock, Download, LoaderCircle, Pencil, Plus, Search, Trash2, Upload, Weight } from "lucide-react";
import { deleteModel, saveModel, type ModelState } from "./actions";
import { shrinkImage } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

const ModelViewer = dynamic(() => import("../commandes/[id]/ModelViewer"), { ssr: false });

export type Model3D = {
  id: string;
  name: string;
  file_path: string | null;
  file_size: number | null;
  photo_path: string | null;
  material: string | null;
  print_minutes: number | null;
  grams: number | null;
  product_slug: string | null;
  notes: string | null;
  created_at: string;
  fileUrl: string | null;
  photoUrl: string | null;
};

const field = "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";
const label = "mb-1 block text-[11.5px] text-muted";
const hours = (min: number) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
const size = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1).replace(".", ",")} Mo` : `${Math.round(b / 1e3)} Ko`);

export default function ModelsView({ models, products }: { models: Model3D[]; products: { slug: string; name: string }[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Model3D | "new" | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [, start] = useTransition();
  const productName = (slug: string | null) => products.find((p) => p.slug === slug)?.name;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? models.filter((m) => [m.name, m.material, m.notes, productName(m.product_slug)].filter(Boolean).join(" ").toLowerCase().includes(q)) : models;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- productName ne dépend que de products
  }, [models, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, matière, article…" aria-label="Chercher un modèle" className={`${field} h-8 pl-8`} />
        </label>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-medium text-on-accent hover:brightness-110"
        >
          <Plus size={14} aria-hidden /> Modèle
        </button>
      </div>

      {editing && <ModelForm model={editing === "new" ? null : editing} products={products} onClose={() => setEditing(null)} />}

      {viewing && models.find((m) => m.id === viewing)?.fileUrl && (
        <div>
          <ModelViewer key={viewing} url={models.find((m) => m.id === viewing)!.fileUrl!} name={models.find((m) => m.id === viewing)!.file_path!} />
        </div>
      )}

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-10 text-center text-[13px] text-muted">Aucun modèle pour l&apos;instant.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-lg border border-line bg-panel">
              <button
                type="button"
                onClick={() => setViewing(viewing === m.id ? null : m.id)}
                disabled={!m.fileUrl}
                className="relative block aspect-[4/3] w-full bg-bg"
                aria-label={`Voir ${m.name} en 3D`}
              >
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- photo du modèle
                  <img src={m.photoUrl} alt="" className="size-full object-cover" />
                ) : (
                  <Box size={36} className="absolute inset-0 m-auto text-muted" aria-hidden />
                )}
                {m.fileUrl && (
                  <span className={`absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-[11px] ${viewing === m.id ? "bg-accent text-on-accent" : "bg-black/60 text-white"}`}>
                    {viewing === m.id ? "Affiché en 3D" : "Voir en 3D"}
                  </span>
                )}
              </button>
              <div className="p-3">
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-[14px] font-medium leading-snug">{m.name}</p>
                  <button type="button" onClick={() => setEditing(m)} aria-label={`Modifier ${m.name}`} className="p-0.5 text-muted hover:text-fg">
                    <Pencil size={13} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => confirm(`Supprimer « ${m.name} » ?`) && start(() => deleteModel(m.id))}
                    aria-label={`Supprimer ${m.name}`}
                    className="p-0.5 text-muted hover:text-red-300"
                  >
                    <Trash2 size={13} aria-hidden />
                  </button>
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted">
                  {m.material && <span>{m.material}</span>}
                  {m.print_minutes ? (
                    <span className="flex items-center gap-1">
                      <Clock size={11} aria-hidden /> {hours(m.print_minutes)}
                    </span>
                  ) : null}
                  {m.grams ? (
                    <span className="flex items-center gap-1">
                      <Weight size={11} aria-hidden /> {Math.round(m.grams)} g
                    </span>
                  ) : null}
                  {productName(m.product_slug) && <span className="text-sky-300">→ {productName(m.product_slug)}</span>}
                </p>
                {m.notes && <p className="mt-1.5 line-clamp-2 text-[12px] text-muted">{m.notes}</p>}
                {m.fileUrl && (
                  <a href={m.fileUrl} download className="mt-2 inline-flex items-center gap-1 text-[12px] text-muted hover:text-fg">
                    <Download size={12} aria-hidden /> {m.file_path?.split("/").pop()}
                    {m.file_size ? ` · ${size(m.file_size)}` : ""}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Ajout ou modification. Les fichiers partent directement du navigateur vers le stockage (jusqu'à 50 Mo).
function ModelForm({ model, products, onClose }: { model: Model3D | null; products: { slug: string; name: string }[]; onClose: () => void }) {
  const [state, action, pending] = useActionState<ModelState, FormData>(saveModel, { status: "idle" });
  const [file, setFile] = useState({ path: model?.file_path ?? "", size: model?.file_size ?? 0 });
  const [photo, setPhoto] = useState(model?.photo_path ?? "");
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (state.status === "success") onClose();
  }, [state.status, onClose]);

  async function upload(f: File | undefined, kind: "file" | "photo") {
    if (!f) return;
    const supabase = createClient();
    if (!supabase) return setError("Stockage indisponible.");
    if (kind === "file" && !/\.(stl|3mf|obj|step|stp)$/i.test(f.name)) return setError("Formats : STL, 3MF, OBJ ou STEP.");
    if (f.size > 50 * 1024 * 1024) return setError("50 Mo maximum.");
    setError(null);
    setUploading(kind === "file" ? "Envoi du fichier…" : "Envoi de la photo…");
    const body = kind === "photo" ? await shrinkImage(f, 1200) : f;
    const safe = body.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").slice(-100);
    const path = `${crypto.randomUUID()}/${safe}`;
    const { error: upError } = await supabase.storage.from("modeles").upload(path, body, { contentType: body.type || "application/octet-stream" });
    setUploading(null);
    if (upError) return setError("Envoi impossible : " + upError.message);
    if (kind === "file") setFile({ path, size: body.size });
    else setPhoto(path);
  }

  return (
    <form action={action} className="grid gap-3 rounded-lg border border-line bg-panel p-3 sm:grid-cols-4">
      <input type="hidden" name="id" value={model?.id ?? ""} />
      <input type="hidden" name="file_path" value={file.path} />
      <input type="hidden" name="file_size" value={file.size || ""} />
      <input type="hidden" name="photo_path" value={photo} />
      <div className="sm:col-span-2">
        <label htmlFor="m-name" className={label}>Nom</label>
        <input id="m-name" name="name" required defaultValue={model?.name} placeholder="Support casque v2" className={field} autoFocus />
      </div>
      <div>
        <label htmlFor="m-mat" className={label}>Matière</label>
        <input id="m-mat" name="material" defaultValue={model?.material ?? ""} placeholder="PLA, PETG…" className={field} />
      </div>
      <div>
        <label htmlFor="m-prod" className={label}>Article de la boutique</label>
        <select id="m-prod" name="product_slug" defaultValue={model?.product_slug ?? ""} className={field}>
          <option value="">Aucun</option>
          {products.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="m-h" className={label}>Temps d&apos;impression (h)</label>
        <input id="m-h" name="print_hours" inputMode="decimal" defaultValue={model?.print_minutes ? String(model.print_minutes / 60).replace(".", ",") : ""} placeholder="2,5" className={field} />
      </div>
      <div>
        <label htmlFor="m-g" className={label}>Poids (g)</label>
        <input id="m-g" name="grams" inputMode="decimal" defaultValue={model?.grams ?? ""} placeholder="45" className={field} />
      </div>
      <div className="sm:col-span-2">
        <span className={label}>Fichiers</span>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[12.5px] hover:border-line-strong">
            <Upload size={13} aria-hidden /> {file.path ? "Remplacer le fichier 3D" : "Fichier 3D"}
            <input type="file" accept=".stl,.3mf,.obj,.step,.stp" className="hidden" onChange={(e) => upload(e.target.files?.[0], "file")} />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[12.5px] hover:border-line-strong">
            <Upload size={13} aria-hidden /> {photo ? "Remplacer la photo" : "Photo"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0], "photo")} />
          </label>
        </div>
        <p className="mt-1 truncate text-[11.5px] text-muted">
          {uploading ?? ([file.path && file.path.split("/").pop(), photo && "photo ajoutée"].filter(Boolean).join(" · ") || "Aucun fichier")}
        </p>
      </div>
      <div className="sm:col-span-4">
        <label htmlFor="m-notes" className={label}>Notes (réglages, support, remplissage…)</label>
        <textarea id="m-notes" name="notes" rows={2} defaultValue={model?.notes ?? ""} className={`${field} resize-y`} />
      </div>
      <div className="flex items-center gap-2 sm:col-span-4">
        <button type="submit" disabled={pending || Boolean(uploading)} className="inline-flex items-center gap-1.5 rounded-md bg-fg px-3 py-1.5 text-[12.5px] font-medium text-bg disabled:opacity-60">
          {pending && <LoaderCircle size={13} className="animate-spin" aria-hidden />}
          Enregistrer
        </button>
        <button type="button" onClick={onClose} className="text-[12.5px] text-muted hover:text-fg">
          Annuler
        </button>
        {(error || state.status === "error") && <p className="text-[12px] text-red-300">{error ?? state.message}</p>}
      </div>
    </form>
  );
}
