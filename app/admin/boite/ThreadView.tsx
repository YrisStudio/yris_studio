"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle, Paperclip, Send, UserRound } from "lucide-react";
import { assignThread, replyThread, setThreadStatus } from "./actions";
import { clientKey } from "@/lib/clients";
import { inboxStatuses, inboxStatusMeta, type InboxMessage, type InboxThread } from "@/lib/inbox";

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });
const select =
  "rounded-md border border-line bg-bg/60 px-2 py-1 text-base text-fg outline-none focus:border-accent sm:text-[12.5px]";

// Sépare le message de l'historique cité en dessous (« Le … a écrit : », « On … wrote: », lignes « > »).
function splitQuote(text: string) {
  const m = text.match(/\n\s*(Le .{5,200}a écrit\s?:|On .{5,200}wrote:|-{2,}\s*Original Message|De\s?: .+\n(Envoyé|Date)\s?:)/i);
  const idx = m?.index ?? text.search(/\n>/);
  return idx > 0 ? { body: text.slice(0, idx).trim(), quote: text.slice(idx).trim() } : { body: text.trim(), quote: "" };
}

function Message({ m }: { m: InboxMessage }) {
  const [showHtml, setShowHtml] = useState(false);
  const { body, quote } = splitQuote(m.text_body ?? "");
  const out = m.direction === "out";
  return (
    <article className={`rounded-lg border p-3.5 ${out ? "border-accent/25 bg-accent/[0.04]" : "border-line bg-panel"}`}>
      <header className="mb-2 flex flex-wrap items-baseline gap-x-2 text-[12px] text-muted">
        <span className="font-medium text-fg">{out ? `Yris${m.author_email ? ` · ${m.author_email.split("@")[0]}` : ""}` : m.contact_name || m.contact_email}</span>
        {!out && m.contact_name && <span>{m.contact_email}</span>}
        <span className="ml-auto font-mono text-[11px]">{dateTime.format(new Date(m.received_at))}</span>
      </header>
      {showHtml && m.html_body ? (
        // Mail d'origine affiché dans un cadre isolé : aucun script, aucun accès au gestionnaire.
        <iframe sandbox="" srcDoc={m.html_body} title="Mail d'origine" className="h-[480px] w-full rounded border border-line bg-white" />
      ) : (
        <p className="whitespace-pre-line break-words text-[13.5px] leading-relaxed">{body || <span className="text-muted">(message sans texte)</span>}</p>
      )}
      {!showHtml && quote && (
        <details className="mt-2 text-[12px] text-muted">
          <summary>Message précédent</summary>
          <p className="mt-1 whitespace-pre-line border-l-2 border-line pl-3">{quote}</p>
        </details>
      )}
      {(m.attachments.length > 0 || m.html_body) && (
        <footer className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {m.attachments.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1 rounded border border-line px-2 py-0.5 text-[11.5px] text-muted">
              <Paperclip size={11} aria-hidden /> {a.filename}
            </span>
          ))}
          {m.html_body && (
            <button type="button" onClick={() => setShowHtml((v) => !v)} className="ml-auto text-[11.5px] text-muted underline-offset-2 hover:text-fg hover:underline">
              {showHtml ? "Texte simple" : "Voir le mail d'origine"}
            </button>
          )}
        </footer>
      )}
    </article>
  );
}

export default function ThreadView({ thread, messages, team }: { thread: InboxThread; messages: InboxMessage[]; team: string[] }) {
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (fn: () => Promise<{ status: string; message?: string }>, clear = false) =>
    start(async () => {
      const res = await fn();
      setMessage(res.message ? { ok: res.status === "success", text: res.message } : null);
      if (clear && res.status === "success") setText("");
    });

  return (
    <div className="space-y-3">
      {/* En-tête : client, statut, personne en charge */}
      <div className="rounded-lg border border-line bg-panel p-3.5">
        <h2 className="text-[15px] font-medium">{thread.subject}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px]">
          <Link href={`/admin/clients/${clientKey(thread.contactEmail)}`} className="inline-flex items-center gap-1 text-muted hover:text-fg">
            <UserRound size={13} aria-hidden /> {thread.contactName ? `${thread.contactName} · ` : ""}
            {thread.contactEmail}
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <label className="sr-only" htmlFor="th-status">Statut</label>
            <select id="th-status" value={thread.status} disabled={pending} onChange={(e) => run(() => setThreadStatus(thread.key, e.target.value))} className={select}>
              {inboxStatuses.map((s) => (
                <option key={s} value={s}>
                  {inboxStatusMeta[s].label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="th-who">Confier à</label>
            <select id="th-who" value={thread.assignedTo ?? ""} disabled={pending} onChange={(e) => run(() => assignThread(thread.key, e.target.value))} className={select}>
              <option value="">Personne</option>
              {(thread.assignedTo && !team.includes(thread.assignedTo) ? [...team, thread.assignedTo] : team).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {messages.map((m) => (
        <Message key={m.id} m={m} />
      ))}

      {/* Réponse */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) run(() => replyThread(thread.key, text), true);
        }}
        className="rounded-lg border border-line bg-panel p-3"
      >
        <label htmlFor="reply" className="mb-1.5 block text-[12px] text-muted">
          Répondre à {thread.contactEmail} (au nom de contact@yris-studio.com)
        </label>
        <textarea
          id="reply"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Bonjour…"
          className="w-full resize-y rounded-md border border-line bg-bg/60 px-2.5 py-2 text-base leading-relaxed text-fg outline-none focus:border-accent sm:text-[13.5px]"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending || !text.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-[13px] font-medium text-on-accent hover:brightness-110 disabled:opacity-50"
          >
            {pending ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Send size={13} aria-hidden />}
            Envoyer
          </button>
          {message && (
            <p role="status" className={`text-[12.5px] ${message.ok ? "text-accent" : "text-red-300"}`}>
              {message.text}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
