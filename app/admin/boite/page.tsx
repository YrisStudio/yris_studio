import Link from "next/link";
import { ArrowLeft, Inbox, MailWarning, Paperclip } from "lucide-react";
import PageHeader from "../PageHeader";
import ThreadView from "./ThreadView";
import { requireAdmin } from "@/lib/admin";
import { emailEnabled } from "@/lib/email";
import { buildThreads, inboxStatusMeta, type InboxStatus } from "@/lib/inbox";
import { getInboxMessages, syncInbox } from "@/lib/inbox-server";

export const metadata = { title: "Boîte de réception" };

const TZ = "Europe/Paris";
const dayKey = (d: Date) => new Intl.DateTimeFormat("fr-CA", { timeZone: TZ }).format(d);
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const shortDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: TZ });
const when = (iso: string) => {
  const d = new Date(iso);
  return dayKey(d) === dayKey(new Date()) ? timeFmt.format(d) : shortDate.format(d);
};

const filters = [
  { id: "ouverts", label: "À traiter" },
  { id: "tous", label: "Tous" },
  { id: "traites", label: "Traités" },
] as const;

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ c?: string; f?: string }> }) {
  await requireAdmin();
  const { c, f } = await searchParams;
  const filter = filters.some((x) => x.id === f) ? (f as (typeof filters)[number]["id"]) : "ouverts";

  // À chaque ouverture : on va chercher chez Resend les mails arrivés depuis la dernière fois.
  const sync = await syncInbox();
  const messages = await getInboxMessages();
  const threads = buildThreads(messages);
  const open = threads.filter((t) => t.status !== "traité");
  const shown = filter === "tous" ? threads : filter === "traites" ? threads.filter((t) => t.status === "traité") : open;
  const current = c ? threads.find((t) => t.key === c) : undefined;
  const currentMessages = current ? messages.filter((m) => m.thread_key === current.key).sort((a, b) => a.received_at.localeCompare(b.received_at)) : [];
  const href = (key?: string, fil = filter) => `/admin/boite?${new URLSearchParams({ ...(fil !== "ouverts" ? { f: fil } : {}), ...(key ? { c: key } : {}) })}`;

  return (
    <div>
      <PageHeader
        title="Boîte de réception"
        description={`contact@yris-studio.com · ${open.length} conversation(s) à traiter${sync.added ? ` · ${sync.added} nouveau(x) mail(s)` : ""}`}
      />

      {!emailEnabled() && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3.5 py-2.5 text-[12.5px] text-amber-200">
          <MailWarning size={15} className="mt-0.5 shrink-0" aria-hidden />
          La réception n&apos;est pas encore branchée : la clé Resend (RESEND_API_KEY) manque sur ce serveur. Les mails arrivent toujours dans Gmail.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Liste des conversations (cachée sur téléphone quand une conversation est ouverte) */}
        <section className={`rounded-lg border border-line bg-panel ${current ? "hidden lg:block" : ""}`}>
          <nav className="flex gap-1 border-b border-line p-1.5 text-[12.5px]" aria-label="Filtrer">
            {filters.map((x) => (
              <Link
                key={x.id}
                href={href(undefined, x.id)}
                aria-current={filter === x.id ? "page" : undefined}
                className={`rounded px-2.5 py-1 ${filter === x.id ? "bg-fg/10 text-fg" : "text-muted hover:text-fg"}`}
              >
                {x.label}
                {x.id === "ouverts" && open.length > 0 && <span className="ml-1.5 font-mono text-[11px] text-muted">{open.length}</span>}
              </Link>
            ))}
          </nav>
          {shown.length === 0 ? (
            <div className="grid place-items-center gap-2 px-4 py-12 text-center text-[13px] text-muted">
              <Inbox size={22} aria-hidden />
              {filter === "ouverts" ? "Rien à traiter, tout est à jour." : "Aucune conversation."}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {shown.map((t) => {
                const active = current?.key === t.key;
                const meta = inboxStatusMeta[t.status as InboxStatus];
                const preview = (t.last.text_body ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
                return (
                  <li key={t.key}>
                    <Link href={href(t.key)} aria-current={active ? "true" : undefined} className={`block px-3.5 py-2.5 ${active ? "bg-fg/[0.06]" : "hover:bg-fg/[0.03]"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`size-2 shrink-0 rounded-full ${meta.dot}`} aria-label={meta.label} />
                        <span className={`min-w-0 flex-1 truncate text-[13px] ${t.unanswered && t.status !== "traité" ? "font-semibold" : ""}`}>
                          {t.contactName || t.contactEmail}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-muted">{when(t.last.received_at)}</span>
                      </div>
                      <p className="mt-0.5 truncate pl-4 text-[12.5px] text-fg/85">
                        {t.subject}
                        {t.count > 1 && <span className="text-muted"> ({t.count})</span>}
                      </p>
                      <p className="flex items-center gap-1.5 truncate pl-4 text-[12px] text-muted">
                        {t.last.direction === "out" && <span className="text-fg/60">Vous :</span>}
                        {t.last.attachments.length > 0 && <Paperclip size={11} className="shrink-0" aria-label="Pièce jointe" />}
                        <span className="truncate">{preview}</span>
                      </p>
                      {t.assignedTo && <p className="mt-1 pl-4 text-[11px] text-muted">→ {t.assignedTo}</p>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Conversation ouverte */}
        <section className={current ? "" : "hidden lg:block"}>
          {current ? (
            <>
              <Link href={href()} className="mb-3 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-fg lg:hidden">
                <ArrowLeft size={13} aria-hidden /> Conversations
              </Link>
              <ThreadView thread={current} messages={currentMessages} />
            </>
          ) : (
            <div className="grid h-full min-h-60 place-items-center rounded-lg border border-dashed border-line text-[13px] text-muted">
              Choisis une conversation.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
