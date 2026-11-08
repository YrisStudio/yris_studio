import Link from "next/link";
import { Briefcase, Globe, Hammer, Megaphone, MapPin, StickyNote, type LucideIcon } from "lucide-react";
import AddTodoForm from "./AddTodoForm";
import TodoItem from "./TodoItem";
import PageHeader from "../PageHeader";
import { requireAdmin } from "@/lib/admin";
import { todoCategories } from "@/lib/todos";
import { getTodos } from "@/lib/todos-server";

export const metadata = { title: "To-do list" };

const icons: Record<string, LucideIcon> = {
  "Réseaux sociaux": Megaphone,
  "Site web": Globe,
  "Sur le terrain": MapPin,
  "Produits et atelier": Hammer,
  Business: Briefcase,
  Autre: StickyNote,
};

const views = [
  { key: "a-faire", label: "À faire" },
  { key: "toutes", label: "Toutes" },
] as const;

export default async function AdminTodo({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  await requireAdmin();
  const { vue } = await searchParams;
  const view = vue === "toutes" ? "toutes" : "a-faire";
  const todos = await getTodos();

  const total = todos.length;
  const doneCount = todos.filter((t) => t.done).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const visible = view === "toutes" ? todos : todos.filter((t) => !t.done);

  // Catégories connues d'abord, puis celles ajoutées à la main.
  const categories = [...new Set([...todoCategories, ...todos.map((t) => t.category)])];
  const groups = categories
    .map((c) => ({
      name: c,
      items: visible.filter((t) => t.category === c),
      left: todos.filter((t) => t.category === c && !t.done).length,
      all: todos.filter((t) => t.category === c).length,
    }))
    .filter((g) => g.all > 0);

  return (
    <div>
      <PageHeader title="To-do list" description="Tout ce qui peut faire grandir Yris. Cochez au fur et à mesure, ajoutez depuis votre téléphone.">
        <div className="flex rounded-lg border border-line bg-panel p-0.5 text-sm">
          {views.map((v) => (
            <Link
              key={v.key}
              href={`/admin/todo?vue=${v.key}`}
              aria-current={view === v.key ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 transition ${view === v.key ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
            >
              {v.label}
            </Link>
          ))}
        </div>
      </PageHeader>

      {/* Progression globale */}
      <section className="theme-dark grid-bg relative mb-4 overflow-hidden rounded-2xl p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fg/[0.05] blur-[90px]" />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-accent-2">Progression</p>
            <p className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
              {doneCount} <span className="text-lg text-muted sm:text-xl">/ {total} tâches faites</span>
            </p>
          </div>
          <p className="font-mono text-2xl text-accent-2">{pct} %</p>
        </div>
        <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <AddTodoForm />

      {/* Raccourcis vers les catégories, pratiques sur téléphone */}
      {groups.length > 1 && (
        <nav aria-label="Catégories" className="-mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {groups.map((g) => {
            const Icon = icons[g.name] ?? StickyNote;
            return (
              <a
                key={g.name}
                href={`#${encodeURIComponent(g.name)}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-sm transition hover:border-accent"
              >
                <Icon size={14} className="text-accent" aria-hidden />
                {g.name}
                <span className="font-mono text-[11px] text-muted">{g.left}</span>
              </a>
            );
          })}
        </nav>
      )}

      {total === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line-strong p-12 text-center text-sm text-muted">
          Aucune tâche pour l&apos;instant. Ajoutez la première ci-dessus.
        </div>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {groups.map((g) => {
            const Icon = icons[g.name] ?? StickyNote;
            const gPct = Math.round(((g.all - g.left) / g.all) * 100);
            return (
              <section key={g.name} id={encodeURIComponent(g.name)} className="scroll-mt-20 rounded-2xl border border-line bg-panel p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 font-medium">
                    <Icon size={16} className="text-accent" aria-hidden />
                    {g.name}
                  </h2>
                  <span className="font-mono text-xs text-muted">
                    {g.all - g.left} / {g.all}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fg/10">
                  <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${gPct}%` }} />
                </div>
                {g.items.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">Tout est fait dans cette catégorie, bravo !</p>
                ) : (
                  <ul className="mt-2 divide-y divide-line">
                    {g.items.map((t) => (
                      <TodoItem key={t.id} todo={t} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
