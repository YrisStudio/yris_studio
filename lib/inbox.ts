// Boîte de réception : types et calculs sans dépendance serveur (utilisés aussi dans le navigateur).

export const inboxStatuses = ["nouveau", "en cours", "traité"] as const;
export type InboxStatus = (typeof inboxStatuses)[number];

// Personnes à qui on peut confier une conversation.

export type InboxMessage = {
  id: string;
  resend_id: string | null;
  direction: "in" | "out";
  thread_key: string;
  contact_email: string;
  contact_name: string | null;
  subject: string;
  text_body: string | null;
  html_body: string | null;
  attachments: { id: string; filename: string; content_type: string; size: number }[];
  message_id: string | null;
  status: InboxStatus;
  assigned_to: string | null;
  author_email: string | null;
  received_at: string;
  created_at: string;
};

export type InboxThread = {
  key: string;
  contactEmail: string;
  contactName: string | null;
  subject: string;
  last: InboxMessage;
  count: number;
  status: InboxStatus;
  assignedTo: string | null;
  unanswered: boolean; // le dernier message vient du client
};

export const inboxStatusMeta: Record<InboxStatus, { label: string; pill: string; dot: string }> = {
  nouveau: { label: "À traiter", pill: "bg-red-400/15 text-red-300", dot: "bg-red-400" },
  "en cours": { label: "En cours", pill: "bg-amber-400/15 text-amber-300", dot: "bg-amber-400" },
  traité: { label: "Traité", pill: "bg-accent/15 text-accent", dot: "bg-accent" },
};

// « Re: Tr: Devis » → « devis » : un même sujet = une même conversation.
export const normalizeSubject = (s: string) =>
  s
    .replace(/^\s*((re|tr|fw|fwd|réf|ref)\s*(\[\d+\])?\s*:\s*)+/i, "")
    .trim()
    .toLowerCase() || "(sans objet)";

export const threadKey = (contact: string, subject: string) => `${contact.toLowerCase()}|${normalizeSubject(subject)}`.slice(0, 400);

// « Jean Dupont <jean@ex.fr> » → { name, email }.
export function parseAddress(raw: string | null | undefined): { name: string | null; email: string } | null {
  if (!raw) return null;
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  const email = (m ? m[2] : raw).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const name = m?.[1]?.replace(/\s+via\s+.+$/i, "").trim() || null;
  return { name, email };
}

// Regroupe les messages en conversations, la plus récente d'abord.
export function buildThreads(messages: InboxMessage[]): InboxThread[] {
  const map = new Map<string, InboxMessage[]>();
  for (const m of messages) map.set(m.thread_key, [...(map.get(m.thread_key) ?? []), m]);
  return [...map.entries()]
    .map(([key, list]) => {
      list.sort((a, b) => a.received_at.localeCompare(b.received_at));
      const last = list[list.length - 1];
      const firstIn = list.find((m) => m.direction === "in") ?? list[0];
      return {
        key,
        contactEmail: last.contact_email,
        contactName: list.map((m) => m.contact_name).filter(Boolean).pop() ?? null,
        subject: firstIn.subject || "(sans objet)",
        last,
        count: list.length,
        status: last.status,
        assignedTo: last.assigned_to,
        unanswered: last.direction === "in",
      };
    })
    .sort((a, b) => b.last.received_at.localeCompare(a.last.received_at));
}
