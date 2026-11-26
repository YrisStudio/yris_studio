import Link from "next/link";
import PageHeader from "../PageHeader";
import { getActivity } from "@/lib/activity";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: "Journal d'activité" };

const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const dayKey = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date(iso));
const colors = ["bg-sky-400/20 text-sky-300", "bg-amber-400/20 text-amber-300", "bg-violet-400/20 text-violet-300", "bg-emerald-400/20 text-emerald-300"];

// Qui a fait quoi et quand, jour par jour. Filtre par personne avec ?qui=Johann.
export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ qui?: string }> }) {
  await requireAdmin();
  const { qui } = await searchParams;
  const all = await getActivity(400);
  const people = [...new Set(all.map((a) => a.actor).filter((n): n is string => Boolean(n)))];
  const list = qui ? all.filter((a) => a.actor === qui) : all;
  const days = [...new Set(list.map((a) => dayKey(a.created_at)))];
  const color = (name: string | null) => (name ? colors[Math.max(0, people.indexOf(name)) % colors.length] : "bg-fg/10 text-muted");

  return (
    <div>
      <PageHeader title="Journal d'activité" description="Tout ce que l'équipe fait dans le gestionnaire, du plus récent au plus ancien." />
      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par personne">
        {[null, ...people].map((p) => (
          <Link
            key={p ?? "tous"}
            href={p ? `/admin/activite?qui=${encodeURIComponent(p)}` : "/admin/activite"}
            aria-current={(qui ?? null) === p ? "page" : undefined}
            className="rounded-md border border-line bg-panel px-2.5 py-1 text-[12.5px] text-muted transition hover:text-fg aria-[current=page]:border-accent aria-[current=page]:bg-accent/15 aria-[current=page]:text-fg"
          >
            {p ?? "Tout le monde"}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-10 text-center text-[13px] text-muted">
          Rien pour l&apos;instant. Chaque changement de statut, devis, expédition ou tâche terminée apparaîtra ici.
        </p>
      ) : (
        <div className="space-y-5">
          {days.map((d) => (
            <section key={d}>
              <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wider text-muted">{day.format(new Date(`${d}T12:00:00`))}</h2>
              <ol className="divide-y divide-line rounded-lg border border-line bg-panel">
                {list
                  .filter((a) => dayKey(a.created_at) === d)
                  .map((a) => {
                    const body = (
                      <>
                        <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${color(a.actor)}`} aria-hidden>
                          {(a.actor ?? "?")[0]?.toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 text-[13px]">
                          <span className="font-medium">{a.actor ?? "Le site"}</span> {a.action}
                          {a.target && <span className="text-muted"> · {a.target}</span>}
                        </span>
                        <span className="shrink-0 font-mono text-[11.5px] text-muted">{time.format(new Date(a.created_at))}</span>
                      </>
                    );
                    return (
                      <li key={a.id}>
                        {a.link ? (
                          <Link href={a.link} className="flex items-center gap-3 px-3 py-2 transition hover:bg-fg/[0.03]">
                            {body}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 px-3 py-2">{body}</div>
                        )}
                      </li>
                    );
                  })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
