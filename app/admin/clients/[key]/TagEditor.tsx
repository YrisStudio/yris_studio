"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { setClientTags } from "../actions";
import { suggestedTags } from "@/lib/clients";

// Étiquettes du client : un clic sur une suggestion l'ajoute, la croix la retire.
export default function TagEditor({ email, tags }: { email: string; tags: string[] }) {
  const [current, setCurrent] = useOptimistic(tags);
  const [, start] = useTransition();
  const [draft, setDraft] = useState("");

  function save(next: string[]) {
    start(async () => {
      setCurrent(next);
      await setClientTags(email, next);
    });
  }

  const add = (t: string) => {
    const v = t.trim();
    if (v && !current.includes(v)) save([...current, v]);
    setDraft("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {current.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-accent/15 py-0.5 pl-2 pr-1 text-[12px] text-accent">
            {t}
            <button type="button" onClick={() => save(current.filter((x) => x !== t))} aria-label={`Retirer l'étiquette ${t}`} className="rounded-full p-0.5 hover:bg-accent/20">
              <X size={11} aria-hidden />
            </button>
          </span>
        ))}
        {current.length === 0 && <span className="text-[12px] text-muted">Aucune</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {suggestedTags
          .filter((t) => !current.includes(t))
          .map((t) => (
            <button key={t} type="button" onClick={() => add(t)} className="inline-flex items-center gap-0.5 rounded-full border border-line px-2 py-0.5 text-[11.5px] text-muted hover:border-line-strong hover:text-fg">
              <Plus size={10} aria-hidden /> {t}
            </button>
          ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add(draft);
        }}
        className="mt-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={30}
          placeholder="Autre étiquette + Entrée"
          aria-label="Ajouter une étiquette"
          className="w-full rounded-md border border-line bg-bg/60 px-2.5 py-1 text-base text-fg outline-none placeholder:text-muted/70 focus:border-accent sm:text-[12.5px]"
        />
      </form>
    </div>
  );
}
