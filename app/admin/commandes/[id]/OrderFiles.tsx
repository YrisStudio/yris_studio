"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Box, Download, Paperclip } from "lucide-react";
import type { OrderFile } from "@/lib/order-files";

// La visionneuse (three.js) n'est téléchargée qu'au premier clic sur « Voir en 3D ».
const ModelViewer = dynamic(() => import("./ModelViewer"), { ssr: false });

export default function OrderFiles({ files }: { files: OrderFile[] }) {
  const firstModel = files.find((f) => f.kind === "3d" && f.url)?.name ?? null;
  const [open, setOpen] = useState<string | null>(firstModel);
  const stored = files.some((f) => f.url);

  return (
    <div className="mt-3 space-y-2">
      <ul className="flex flex-wrap gap-1.5">
        {files.map((f) =>
          f.url ? (
            <li key={f.name} className="flex items-center overflow-hidden rounded border border-line font-mono text-[11.5px]">
              {f.kind === "3d" ? (
                <button
                  type="button"
                  onClick={() => setOpen(open === f.name ? null : f.name)}
                  aria-pressed={open === f.name}
                  className={`flex items-center gap-1.5 px-2 py-1 transition ${open === f.name ? "bg-accent/15 text-accent" : "text-muted hover:text-fg"}`}
                >
                  <Box size={11} aria-hidden /> {f.name}
                </button>
              ) : f.kind === "image" ? (
                <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2 py-1 text-muted hover:text-fg">
                  {/* eslint-disable-next-line @next/next/no-img-element -- lien temporaire Supabase */}
                  <img src={f.url} alt="" className="size-5 rounded object-cover" /> {f.name}
                </a>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-1 text-muted">
                  <Paperclip size={11} aria-hidden /> {f.name}
                </span>
              )}
              <a href={f.url} download={f.name} title={`Télécharger ${f.name}`} className="border-l border-line px-1.5 py-1 text-muted hover:text-fg">
                <Download size={11} aria-hidden />
                <span className="sr-only">Télécharger {f.name}</span>
              </a>
            </li>
          ) : (
            <li key={f.name} className="flex items-center gap-1.5 rounded border border-line px-2 py-1 font-mono text-[11.5px] text-muted">
              <Paperclip size={11} aria-hidden /> {f.name}
            </li>
          ),
        )}
      </ul>
      {open && files.find((f) => f.name === open)?.url && <ModelViewer key={open} url={files.find((f) => f.name === open)!.url!} name={open} />}
      {!stored && <p className="text-[11.5px] text-muted">Les fichiers ont été envoyés en pièce jointe sur l&apos;email de notification.</p>}
    </div>
  );
}
