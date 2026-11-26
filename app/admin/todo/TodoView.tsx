"use client";

import { useActionState, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, Check, ChevronRight, LoaderCircle, Package, Plus, Trash2 } from "lucide-react";
import { addTodo, deleteTodo, setTodoAssignee, setTodoDone, setTodoDue, setTodoPriority, type TodoState } from "./actions";
import { statusMeta } from "@/lib/orders-meta";
import type { OrderStatus } from "@/lib/site";
import { priorities, todoCategories, type Todo } from "@/lib/todos";

const field =
  "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";

const priorityStyle: Record<number, string> = {
  1: "bg-red-400/15 text-red-300",
  2: "bg-fg/[0.07] text-muted",
  3: "bg-fg/[0.04] text-muted/70",
};
const priorityLabel: Record<number, string> = { 1: "Urgent", 2: "Normal", 3: "Plus tard" };

// Une couleur fixe par personne, pour la reconnaître d'un coup d'œil.
const personColors = ["bg-sky-400/20 text-sky-300", "bg-amber-400/20 text-amber-300", "bg-violet-400/20 text-violet-300", "bg-emerald-400/20 text-emerald-300"];

const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
// Date du jour à Paris (AAAA-MM-JJ), pareille sur le serveur et dans le navigateur.
const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());

function dueInfo(due: string | null, done: boolean) {
  if (!due) return null;
  const t = today();
  const late = !done && due < t;
  const label = due === t ? "Aujourd'hui" : dayFmt.format(new Date(`${due}T12:00:00`));
  return { label, late, soon: !done && due === t };
}

export type AssignedOrder = {
  id: string;
  ref: string;
  title: string;
  customer: string | null;
  status: string;
  due: string | null;
  assignee: string;
};

type Change = { id: string; done?: boolean; priority?: 1 | 2 | 3; assigned_to?: string | null; due_date?: string | null; removed?: boolean };
type Who = "tous" | "personne" | string;

export default function TodoView({ todos, assignees, me, orders }: { todos: Todo[]; assignees: string[]; me: string | null; orders: AssignedOrder[] }) {
  const [, start] = useTransition();
  const [list, apply] = useOptimistic(todos, (state, c: Change) =>
    c.removed ? state.filter((t) => t.id !== c.id) : state.map((t) => (t.id === c.id ? { ...t, ...c } : t)),
  );
  const [view, setView] = useState<"a-faire" | "toutes" | "faites">("a-faire");
  const [who, setWho] = useState<Who>("tous");
  const [category, setCategory] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Les anciens prénoms restent affichés même si la personne a quitté l'équipe.
  const people = useMemo(
    () => [...new Set([...assignees, ...list.map((t) => t.assigned_to).filter((n): n is string => Boolean(n))])],
    [assignees, list],
  );
  const color = (name: string) => personColors[Math.max(0, people.indexOf(name)) % personColors.length];

  const change = (c: Change, fn: () => Promise<void>) =>
    start(async () => {
      apply(c);
      await fn();
    });

  const total = list.length;
  const done = list.filter((t) => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const byWho = (t: Todo) => (who === "tous" ? true : who === "personne" ? !t.assigned_to : t.assigned_to === who);
  const openFor = (name: Who) =>
    list.filter((t) => !t.done && (name === "personne" ? !t.assigned_to : t.assigned_to === name)).length +
    (name === "personne" ? 0 : orders.filter((o) => o.assignee === name).length);

  const categories = useMemo(() => {
    const names = [...new Set([...todoCategories, ...list.map((t) => t.category)])];
    return names
      .map((name) => {
        const mine = list.filter((t) => t.category === name && byWho(t));
        return { name, all: mine.length, left: mine.filter((t) => !t.done).length };
      })
      .filter((c) => c.all > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- byWho dépend de who
  }, [list, who]);

  const visible = list
    .filter((t) => (view === "a-faire" ? !t.done : view === "faites" ? t.done : true))
    .filter(byWho)
    .filter((t) => !category || t.category === category)
    .sort(
      (a, b) =>
        Number(a.done) - Number(b.done) ||
        a.priority - b.priority ||
        (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") ||
        a.created_at.localeCompare(b.created_at),
    );
  const groups = categories.map((c) => ({ ...c, items: visible.filter((t) => t.category === c.name) })).filter((g) => g.items.length > 0);
  const theirOrders = who === "tous" ? orders : who === "personne" ? [] : orders.filter((o) => o.assignee === who);

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

      {/* Qui fait quoi */}
      <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Qui fait quoi">
        {(["tous", ...people, "personne"] as Who[]).map((p) => {
          const active = who === p;
          const label = p === "tous" ? "Tout le monde" : p === "personne" ? "Personne" : p === me ? `${p} (moi)` : p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setWho(p)}
              aria-pressed={active}
              className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12.5px] transition ${
                active ? "border-accent bg-accent/15 text-fg" : "border-line bg-panel text-muted hover:text-fg"
              }`}
            >
              {p !== "tous" && p !== "personne" && (
                <span className={`grid size-5 place-items-center rounded-full text-[10.5px] font-semibold ${color(p)}`} aria-hidden>
                  {p[0]?.toUpperCase()}
                </span>
              )}
              {label}
              {p !== "tous" && <span className="font-mono text-[10.5px] opacity-70">{openFor(p)}</span>}
            </button>
          );
        })}
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
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-medium text-on-accent transition hover:brightness-110"
        >
          <Plus size={14} aria-hidden /> Tâche
        </button>
      </div>

      {adding && (
        <AddTodoForm
          onDone={() => setAdding(false)}
          defaultCategory={category}
          people={people}
          defaultAssignee={who !== "tous" && who !== "personne" ? who : (me ?? "")}
        />
      )}

      {/* Commandes confiées : la partie « commandes » de qui fait quoi */}
      {theirOrders.length > 0 && view !== "faites" && (
        <section className="rounded-lg border border-line bg-panel">
          <header className="flex items-center gap-2 border-b border-line px-4 py-2">
            <Package size={14} className="text-muted" aria-hidden />
            <h2 className="text-[13px] font-medium">Commandes confiées</h2>
            <span className="font-mono text-[11px] text-muted">{theirOrders.length}</span>
          </header>
          <ul className="divide-y divide-line">
            {theirOrders.map((o) => {
              const due = dueInfo(o.due, false);
              const meta = statusMeta[o.status as OrderStatus];
              return (
                <li key={o.id}>
                  <Link href={`/admin/commandes/${o.id}`} className="flex items-center gap-2.5 px-3 py-2 transition hover:bg-fg/[0.03]">
                    <span className={`grid size-[18px] shrink-0 place-items-center rounded-full text-[10px] font-semibold ${color(o.assignee)}`} title={o.assignee}>
                      {o.assignee[0]?.toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px]">{o.title}</span>
                      <span className="block truncate font-mono text-[11px] text-muted">
                        {o.ref}
                        {o.customer && ` · ${o.customer}`}
                      </span>
                    </span>
                    {due && (
                      <span className={`hidden shrink-0 items-center gap-1 text-[11.5px] sm:flex ${due.late ? "text-red-300" : "text-muted"}`}>
                        <CalendarClock size={12} aria-hidden /> {due.label}
                      </span>
                    )}
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] ${meta?.pill ?? ""}`}>{meta?.label ?? o.status}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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
          {view === "a-faire" ? (who === "tous" ? "Tout est fait ici. 🎉" : "Rien à faire de ce côté. 🎉") : "Aucune tâche."}
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
              {g.items.map((t) => {
                const due = dueInfo(t.due_date, t.done);
                return (
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
                        className="flex min-w-0 flex-1 flex-col items-start text-left"
                      >
                        <span className="flex w-full items-start gap-1.5">
                          <span className={`flex-1 text-[13.5px] leading-snug ${t.done ? "text-muted line-through" : ""}`}>{t.title}</span>
                          <ChevronRight size={14} className={`mt-0.5 shrink-0 text-muted transition-transform ${open === t.id ? "rotate-90" : ""}`} aria-hidden />
                        </span>
                        {due && (
                          <span className={`mt-0.5 flex items-center gap-1 text-[11.5px] ${due.late ? "text-red-300" : due.soon ? "text-amber-300" : "text-muted"}`}>
                            <CalendarClock size={11} aria-hidden /> {due.late ? `En retard · ${due.label}` : due.label}
                          </span>
                        )}
                      </button>
                      {/* Qui s'en occupe */}
                      <label className="relative shrink-0" title={t.assigned_to ? `Confiée à ${t.assigned_to}` : "Personne"}>
                        <span className="sr-only">Qui s&apos;en occupe</span>
                        <span
                          className={`grid size-[22px] place-items-center rounded-full text-[10.5px] font-semibold ${
                            t.assigned_to ? color(t.assigned_to) : "border border-dashed border-line-strong text-muted"
                          }`}
                          aria-hidden
                        >
                          {t.assigned_to ? t.assigned_to[0]?.toUpperCase() : "?"}
                        </span>
                        <select
                          value={t.assigned_to ?? ""}
                          onChange={(e) => {
                            const v = e.target.value || null;
                            change({ id: t.id, assigned_to: v }, () => setTodoAssignee(t.id, v ?? ""));
                          }}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        >
                          <option value="">Personne</option>
                          {people.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </label>
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
                    {open === t.id && (
                      <div className="ml-7 mt-1.5 space-y-2">
                        {t.details && <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-muted">{t.details}</p>}
                        <label className="flex items-center gap-2 text-[12px] text-muted">
                          Pour le
                          <input
                            type="date"
                            value={t.due_date ?? ""}
                            onChange={(e) => change({ id: t.id, due_date: e.target.value || null }, () => setTodoDue(t.id, e.target.value))}
                            className="rounded border border-line bg-bg/60 px-1.5 py-0.5 text-[12px] text-fg outline-none focus:border-accent"
                          />
                          {t.due_date && (
                            <button type="button" onClick={() => change({ id: t.id, due_date: null }, () => setTodoDue(t.id, ""))} className="hover:text-fg">
                              Retirer
                            </button>
                          )}
                        </label>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function AddTodoForm({
  onDone,
  defaultCategory,
  people,
  defaultAssignee,
}: {
  onDone: () => void;
  defaultCategory: string | null;
  people: string[];
  defaultAssignee: string;
}) {
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
    <form ref={ref} action={action} className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-panel p-3 sm:grid-cols-4">
      <input name="title" required maxLength={200} placeholder="Nouvelle tâche…" aria-label="Tâche" className={`${field} col-span-2 sm:col-span-4`} autoFocus />
      <select name="category" defaultValue={defaultCategory ?? "Business"} aria-label="Catégorie" className={field}>
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
      <select name="assigned_to" defaultValue={defaultAssignee} aria-label="Qui s'en occupe" className={field}>
        <option value="">Personne</option>
        {people.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <input name="due_date" type="date" aria-label="Pour le" className={field} />
      <textarea name="details" rows={2} maxLength={2000} placeholder="Détails (facultatif)" aria-label="Détails" className={`${field} col-span-2 resize-y sm:col-span-3`} />
      <button type="submit" disabled={pending} className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-md bg-fg px-3 py-2 text-[12.5px] font-medium text-bg disabled:opacity-60 sm:col-span-1">
        {pending ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Plus size={13} aria-hidden />}
        Ajouter
      </button>
      {state.status === "error" && <p className="col-span-2 text-[12px] text-red-300 sm:col-span-4">{state.message}</p>}
    </form>
  );
}
