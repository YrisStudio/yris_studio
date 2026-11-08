"use client";

import { useOptimistic, useTransition } from "react";
import { Check, ChevronDown, Trash2 } from "lucide-react";
import { deleteTodo, setTodoDone } from "./actions";
import type { Todo } from "@/lib/todos";

const priorityStyle: Record<number, string> = {
  1: "bg-accent/15 text-accent",
  3: "bg-fg/5 text-muted",
};
const priorityLabel: Record<number, string> = { 1: "Urgent", 3: "Plus tard" };

// Une tâche : la case se coche tout de suite, l'enregistrement suit en arrière-plan.
export default function TodoItem({ todo }: { todo: Todo }) {
  const [done, setDone] = useOptimistic(todo.done);
  const [removing, startRemove] = useTransition();
  const [, startToggle] = useTransition();

  function toggle() {
    startToggle(async () => {
      setDone(!done);
      await setTodoDone(todo.id, !done);
    });
  }

  function remove() {
    if (!confirm(`Supprimer « ${todo.title} » ?`)) return;
    startRemove(() => deleteTodo(todo.id));
  }

  return (
    <li className={`group flex items-start gap-3 py-3 transition-opacity ${removing ? "opacity-40" : ""}`}>
      <button
        type="button"
        onClick={toggle}
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Marquer « ${todo.title} » à faire` : `Marquer « ${todo.title} » faite`}
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border transition ${
          done ? "border-accent bg-accent text-on-accent" : "border-line-strong hover:border-accent"
        }`}
      >
        {done && <Check size={14} strokeWidth={3} aria-hidden />}
      </button>

      <div className="min-w-0 flex-1">
        {todo.details ? (
          <details className="group/d">
            <summary className="flex cursor-pointer list-none items-start gap-2 [&::-webkit-details-marker]:hidden">
              <span className={`flex-1 text-[15px] leading-snug ${done ? "text-muted line-through" : ""}`}>{todo.title}</span>
              <ChevronDown size={16} className="mt-0.5 shrink-0 text-muted transition-transform group-open/d:rotate-180" aria-hidden />
            </summary>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{todo.details}</p>
          </details>
        ) : (
          <p className={`text-[15px] leading-snug ${done ? "text-muted line-through" : ""}`}>{todo.title}</p>
        )}
        {!done && priorityLabel[todo.priority] && (
          <span className={`mt-1.5 inline-block rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${priorityStyle[todo.priority]}`}>
            {priorityLabel[todo.priority]}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={remove}
        disabled={removing}
        aria-label={`Supprimer « ${todo.title} »`}
        className="-mr-1 p-1.5 text-muted opacity-60 transition hover:text-red-600 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        <Trash2 size={15} aria-hidden />
      </button>
    </li>
  );
}
