"use client";

import { useActionState, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { Check, ChevronRight, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { addTodo, deleteTodo, setTodoDone, setTodoPriority, type TodoState } from "./actions";
import { priorities, todoCategories, type Todo } from "@/lib/todos";

const field =
  "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";

const priorityStyle: Record<number, string> = {
  1: "bg-red-400/15 text-red-300",
  2: "bg-fg/[0.07] text-muted",
  3: "bg-fg/[0.04] text-muted/70",
};
const priorityLabel: Record<number, string> = { 1: "Urgent", 2: "Normal", 3: "Plus tard" };

type Change = { id: string; done?: boolean; priority?: 1 | 2 | 3; removed?: boolean };

export default function TodoView({ todos }: { todos: Todo[] }) {
  const [, start] = useTransition();
  const [list, apply] = useOptimistic(todos, (state, c: Change) =>
    c.removed ? state.filter((t) => t.id !== c.id) : state.map((t) => (t.id === c.id ? { ...t, ...c } : t)),
  );
  const [view, setView] = useState<"a-faire" | "toutes" | "faites">("a-faire");
  const [category, setCategory] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const change = (c: Change, fn: () => Promise<void>) =>
    start(async () => {
      apply(c);
      await fn();
    });

  const total = list.length;
  const done = list.filter((t) => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const categories = useMemo(() => {
    const names = [...new Set([...todoCategories, ...list.map((t) => t.category)])];
    return names
      .map((name) => ({ name, all: list.filter((t) => t.category === name).length, left: list.filter((t) => t.category === name && !t.done).length }))
      .filter((c) => c.all > 0);
  }, [list]);

  const visible = list
    .filter((t) => (view === "a-faire" ? !t.done : view === "faites" ? t.done : true))
    .filter((t) => !category || t.category === category)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.priority - b.priority || a.created_at.localeCompare(b.created_at));
  const groups = categories.map((c) => ({ ...c, items: visible.filter((t) => t.category === c.name) })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {/* Progression */}
      <div className="rounded-lg border border-line bg-panel px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13px]">
            <span className="font-mono text-[18px]">{done}</span>
            <span className="text-muted"> / {total} faites</span>
          </p>
          <p className="font-mono text-[18px] text-accent">{pct} %</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fg/10">
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-line bg-panel p-0.5 text-[12.5px]" role="group" aria-label="Affichage">
          {(
            [
              ["a-faire", "À faire"],
              ["faites", "Faites"],
              ["toutes", "Toutes"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded px-2.5 py-1 transition ${view === v ? "bg-fg/10 text-fg" : "text-muted hover:text-fg"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAdding((a) => !a)}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-medium text-on-accent transition hover:brightness-110"
        >
          <Plus size={14} aria-hidden /> Tâche
        </button>
      </div>

      {adding && <AddTodoForm onDone={() => setAdding(false)} defaultCategory={category} />}

      {/* Catégories */}
      <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {categories.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => setCategory(category === c.name ? null : c.name)}
            aria-pressed={category === c.name}
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[12px] transition ${
              category === c.name ? "border-accent bg-accent/15 text-accent" : "border-line text-muted hover:text-fg"
            }`}
          >
            {c.name} <span className="font-mono text-[10.5px] opacity-70">{c.left}</span>
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-10 text-center text-[13px] text-muted">
          {view === "a-faire" ? "Tout est fait ici. 🎉" : "Aucune tâche."}
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.name} className="rounded-lg border border-line bg-panel">
            <header className="flex items-center gap-2 border-b border-line px-4 py-2">
              <h2 className="text-[13px] font-medium">{g.name}</h2>
              <span className="font-mono text-[11px] text-muted">
                {g.all - g.left}/{g.all}
              </span>
              <div className="ml-auto h-1 w-20 overflow-hidden rounded-full bg-fg/10">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(((g.all - g.left) / g.all) * 100)}%` }} />
              </div>
            </header>
            <ul className="divide-y divide-line">
              {g.items.map((t) => (
                <li key={t.id} className="group px-3 py-2">
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={t.done}
                      aria-label={t.done ? `Marquer « ${t.title} » à faire` : `Marquer « ${t.title} » faite`}
                      onClick={() => change({ id: t.id, done: !t.done }, () => setTodoDone(t.id, !t.done))}
                      className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded border transition ${
                        t.done ? "border-accent bg-accent text-on-accent" : "border-line-strong hover:border-accent"
                      }`}
                    >
                      {t.done && <Check size={12} strokeWidth={3} aria-hidden />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(open === t.id ? null : t.id)}
                      aria-expanded={open === t.id}
                      className="flex min-w-0 flex-1 items-start gap-1.5 text-left"
                    >
                      <span className={`flex-1 text-[13.5px] leading-snug ${t.done ? "text-muted line-through" : ""}`}>{t.title}</span>
                      {t.details && (
                        <ChevronRight size={14} className={`mt-0.5 shrink-0 text-muted transition-transform ${open === t.id ? "rotate-90" : ""}`} aria-hidden />
                      )}
                    </button>
                    {!t.done && (
                      <select
                        value={t.priority}
                        onChange={(e) => {
                          const p = Number(e.target.value) as 1 | 2 | 3;
                          change({ id: t.id, priority: p }, () => setTodoPriority(t.id, p));
                        }}
                        aria-label="Priorité"
                        className={`shrink-0 rounded px-1 py-0.5 text-[11px] outline-none ${priorityStyle[t.priority]}`}
                      >
                        {priorities.map((p) => (
                          <option key={p.value} value={p.value}>
                            {priorityLabel[p.value]}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => confirm(`Supprimer « ${t.title} » ?`) && change({ id: t.id, removed: true }, () => deleteTodo(t.id))}
                      aria-label={`Supprimer « ${t.title} »`}
                      className="shrink-0 p-0.5 text-muted opacity-60 transition hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    >
                      <Trash2 size={13} aria-hidden />
                    </button>
                  </div>
                  {open === t.id && t.details && <p className="ml-7 mt-1.5 whitespace-pre-line text-[12.5px] leading-relaxed text-muted">{t.details}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function AddTodoForm({ onDone, defaultCategory }: { onDone: () => void; defaultCategory: string | null }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<TodoState, FormData>(async (prev, fd) => {
    const res = await addTodo(prev, fd);
    if (res.status === "success") {
      ref.current?.reset();
      onDone();
    }
    return res;
  }, { status: "idle" });
  return (
    <form ref={ref} action={action} className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-panel p-3 sm:grid-cols-[1fr_170px_120px_auto]">
      <input name="title" required maxLength={200} placeholder="Nouvelle tâche…" aria-label="Tâche" className={`${field} col-span-2 sm:col-span-1`} autoFocus />
      <select name="category" defaultValue={defaultCategory ?? "Réseaux sociaux"} aria-label="Catégorie" className={field}>
        {todoCategories.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <select name="priority" defaultValue="2" aria-label="Priorité" className={field}>
        {priorities.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="col-span-2 inline-flex h-[34px] items-center justify-center gap-1.5 rounded-md bg-fg px-3 text-[12.5px] font-medium text-bg disabled:opacity-60 sm:col-span-1">
        {pending ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Plus size={13} aria-hidden />}
        Ajouter
      </button>
      <textarea name="details" rows={2} maxLength={2000} placeholder="Détails (facultatif)" aria-label="Détails" className={`${field} col-span-2 resize-y sm:col-span-4`} />
      {state.status === "error" && <p className="col-span-2 text-[12px] text-red-300 sm:col-span-4">{state.message}</p>}
    </form>
  );
}
