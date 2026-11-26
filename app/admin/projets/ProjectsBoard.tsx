"use client";

import { useActionState, useEffect, useOptimistic, useState, useTransition } from "react";
import { CalendarClock, Check, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteProject, moveProject, saveProject, toggleStep, type ProjectState, type Step } from "./actions";

export type Project = {
  id: string;
  title: string;
  description: string | null;
  status: "idée" | "en cours" | "terminé";
  assigned_to: string | null;
  due_date: string | null;
  steps: Step[];
  created_at: string;
};

const columns = [
  { id: "idée", label: "Idées", dot: "bg-fg/40" },
  { id: "en cours", label: "En cours", dot: "bg-amber-400" },
  { id: "terminé", label: "Terminés", dot: "bg-accent" },
] as const;

const field = "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";
const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

export default function ProjectsBoard({ projects, people }: { projects: Project[]; people: string[] }) {
  const [, start] = useTransition();
  const [list, apply] = useOptimistic(projects, (state, m: { id: string; status?: Project["status"]; step?: number; removed?: boolean }) =>
    m.removed
      ? state.filter((p) => p.id !== m.id)
      : state.map((p) =>
          p.id !== m.id
            ? p
            : {
                ...p,
                ...(m.status ? { status: m.status } : {}),
                ...(m.step !== undefined ? { steps: p.steps.map((s, i) => (i === m.step ? { ...s, done: !s.done } : s)) } : {}),
              },
        ),
  );
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const move = (id: string, status: Project["status"]) =>
    start(async () => {
      apply({ id, status });
      await moveProject(id, status);
    });

  return (
    <div>
      <button
        type="button"
        onClick={() => setEditing("new")}
        className="mb-4 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-medium text-on-accent hover:brightness-110"
      >
        <Plus size={14} aria-hidden /> Projet
      </button>

      {editing && <ProjectForm project={editing === "new" ? null : editing} people={people} onClose={() => setEditing(null)} />}

      <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
        {columns.map((c) => {
          const items = list.filter((p) => p.status === c.id);
          return (
            <section
              key={c.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(c.id);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={() => {
                if (dragged) move(dragged, c.id);
                setDragged(null);
                setOver(null);
              }}
              className={`w-[85vw] shrink-0 snap-start rounded-lg border bg-panel/60 p-2 sm:w-auto ${over === c.id ? "border-accent" : "border-line"}`}
            >
              <header className="mb-2 flex items-center gap-2 px-1.5 py-1">
                <span className={`size-2 rounded-full ${c.dot}`} aria-hidden />
                <h2 className="text-[13px] font-medium">{c.label}</h2>
                <span className="font-mono text-[11px] text-muted">{items.length}</span>
              </header>
              <ul className="space-y-2">
                {items.map((p) => {
                  const done = p.steps.filter((s) => s.done).length;
                  const late = p.due_date && p.status !== "terminé" && p.due_date < new Date().toISOString().slice(0, 10);
                  return (
                    <li
                      key={p.id}
                      draggable
                      onDragStart={() => setDragged(p.id)}
                      onDragEnd={() => setDragged(null)}
                      className={`group rounded-md border border-line bg-panel-2 p-2.5 ${dragged === p.id ? "opacity-40" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-[13.5px] font-medium leading-snug">{p.title}</p>
                        <button type="button" onClick={() => setEditing(p)} aria-label={`Modifier ${p.title}`} className="p-0.5 text-muted hover:text-fg">
                          <Pencil size={12} aria-hidden />
                        </button>
                      </div>
                      {p.description && <p className="mt-1 line-clamp-3 whitespace-pre-line text-[12px] text-muted">{p.description}</p>}
                      {p.steps.length > 0 && (
                        <>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-fg/10">
                            <div className="h-full rounded-full bg-accent" style={{ width: `${(done / p.steps.length) * 100}%` }} />
                          </div>
                          <ul className="mt-2 space-y-1">
                            {p.steps.map((s, i) => (
                              <li key={i}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    start(async () => {
                                      apply({ id: p.id, step: i });
                                      await toggleStep(p.id, i);
                                    })
                                  }
                                  className="flex w-full items-start gap-2 text-left text-[12.5px]"
                                >
                                  <span className={`mt-0.5 grid size-3.5 shrink-0 place-items-center rounded border ${s.done ? "border-accent bg-accent text-on-accent" : "border-line-strong"}`}>
                                    {s.done && <Check size={10} strokeWidth={3} aria-hidden />}
                                  </span>
                                  <span className={s.done ? "text-muted line-through" : ""}>{s.text}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-[11.5px] text-muted">
                        {p.assigned_to && <span className="rounded-full bg-sky-400/20 px-1.5 text-sky-300">{p.assigned_to}</span>}
                        {p.due_date && (
                          <span className={`flex items-center gap-1 ${late ? "text-red-300" : ""}`}>
                            <CalendarClock size={11} aria-hidden /> {dateFmt.format(new Date(`${p.due_date}T12:00:00`))}
                          </span>
                        )}
                        {/* Sur téléphone, pas de glisser-déposer : on change l'étape ici. */}
                        <select
                          value={p.status}
                          onChange={(e) => move(p.id, e.target.value as Project["status"])}
                          aria-label="Étape"
                          className="ml-auto rounded bg-fg/[0.06] px-1 py-0.5 text-[11px] text-muted outline-none"
                        >
                          {columns.map((col) => (
                            <option key={col.id} value={col.id}>
                              {col.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            confirm(`Supprimer le projet « ${p.title} » ?`) &&
                            start(async () => {
                              apply({ id: p.id, removed: true });
                              await deleteProject(p.id);
                            })
                          }
                          aria-label={`Supprimer ${p.title}`}
                          className="hover:text-red-300"
                        >
                          <Trash2 size={12} aria-hidden />
                        </button>
                      </div>
                    </li>
                  );
                })}
                {items.length === 0 && <li className="px-2 py-6 text-center text-[12px] text-muted">Glisse un projet ici.</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ProjectForm({ project, people, onClose }: { project: Project | null; people: string[]; onClose: () => void }) {
  const [state, action, pending] = useActionState<ProjectState, FormData>(saveProject, { status: "idle" });
  const [steps, setSteps] = useState<Step[]>(project?.steps ?? []);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (state.status === "success") onClose();
  }, [state.status, onClose]);

  const addStep = () => {
    if (!draft.trim()) return;
    setSteps((s) => [...s, { text: draft.trim(), done: false }]);
    setDraft("");
  };

  return (
    <form action={action} className="mb-4 grid gap-2 rounded-lg border border-line bg-panel p-3 sm:grid-cols-[1fr_160px_150px]">
      <input type="hidden" name="id" value={project?.id ?? ""} />
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />
      <input name="title" required defaultValue={project?.title} maxLength={200} placeholder="Nom du projet (ex. Stand au marché de Noël)" aria-label="Nom" className={field} autoFocus />
      <select name="assigned_to" defaultValue={project?.assigned_to ?? ""} aria-label="Qui s'en occupe" className={field}>
        <option value="">Personne</option>
        {people.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      <input name="due_date" type="date" defaultValue={project?.due_date ?? ""} aria-label="Pour le" className={field} />
      <textarea name="description" rows={2} defaultValue={project?.description ?? ""} placeholder="Description (facultatif)" aria-label="Description" className={`${field} resize-y sm:col-span-3`} />
      <div className="sm:col-span-3">
        <p className="mb-1 text-[12px] text-muted">Étapes</p>
        <ul className="space-y-1">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-[13px]">
              <span className="flex-1">{s.text}</span>
              <button type="button" onClick={() => setSteps((all) => all.filter((_, j) => j !== i))} aria-label="Retirer l'étape" className="text-muted hover:text-red-300">
                <X size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-1.5 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addStep();
              }
            }}
            placeholder="Ajouter une étape puis Entrée"
            aria-label="Nouvelle étape"
            className={field}
          />
          <button type="button" onClick={addStep} className="rounded-md border border-line px-2.5 text-[12.5px] text-muted hover:text-fg">
            Ajouter
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:col-span-3">
        <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-md bg-fg px-3 py-1.5 text-[12.5px] font-medium text-bg disabled:opacity-60">
          {pending && <LoaderCircle size={13} className="animate-spin" aria-hidden />}
          Enregistrer
        </button>
        <button type="button" onClick={onClose} className="text-[12.5px] text-muted hover:text-fg">
          Annuler
        </button>
        {state.status === "error" && <p className="text-[12px] text-red-300">{state.message}</p>}
      </div>
    </form>
  );
}
