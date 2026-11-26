"use client";

import { useActionState, useRef, useTransition } from "react";
import { LoaderCircle, Plus, X } from "lucide-react";
import { deleteCollection, saveCollection, type ProductState } from "./actions";

const field = "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";

// Collections de la boutique : « Idées cadeaux », « Spécial voiture »… On les coche ensuite dans chaque article.
export default function CollectionsManager({ collections }: { collections: { slug: string; name: string; count: number }[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const [, start] = useTransition();
  const [state, action, pending] = useActionState<ProductState, FormData>(async (prev, fd) => {
    const res = await saveCollection(prev, fd);
    if (res.status === "success") ref.current?.reset();
    return res;
  }, { status: "idle" });

  return (
    <div className="space-y-3">
      {collections.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {collections.map((c) => (
            <li key={c.slug} className="flex items-center gap-1.5 rounded-full border border-line bg-bg/40 py-0.5 pl-2.5 pr-1 text-[12.5px]">
              {c.name}
              <span className="font-mono text-[10.5px] text-muted">{c.count}</span>
              <button
                type="button"
                onClick={() => confirm(`Supprimer la collection « ${c.name} » ? Les articles restent en vente.`) && start(() => deleteCollection(c.slug).then(() => undefined))}
                aria-label={`Supprimer ${c.name}`}
                className="rounded-full p-0.5 text-muted hover:text-red-300"
              >
                <X size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form ref={ref} action={action} className="grid gap-2 sm:grid-cols-[200px_1fr_auto]">
        <input name="name" required maxLength={80} placeholder="Idées cadeaux" aria-label="Nom de la collection" className={field} />
        <input name="description" maxLength={500} placeholder="Phrase affichée sur la boutique (facultatif)" aria-label="Description" className={field} />
        <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[12.5px] hover:border-line-strong disabled:opacity-60">
          {pending ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Plus size={13} aria-hidden />} Collection
        </button>
      </form>
      {state.status === "error" && <p className="text-[12px] text-red-300">{state.message}</p>}
    </div>
  );
}
