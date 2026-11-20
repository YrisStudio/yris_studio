import { resendGet } from "@/lib/email";
import { parseAddress, threadKey, type InboxMessage } from "@/lib/inbox";
import { createClient } from "@/lib/supabase/server";

type ResendAttachment = { id: string; filename: string; content_type: string; size: number };
type ResendListItem = { id: string; from: string; to: string[]; reply_to?: string[] | null; subject: string; created_at: string; message_id?: string };
type ResendEmail = ResendListItem & { text: string | null; html: string | null; attachments?: ResendAttachment[] };

const OUR_DOMAIN = "@yris-studio.com";

// Récupère chez Resend les mails pas encore rangés dans la base (au plus 25 par ouverture de la page).
// Sans clé Resend, ne fait rien. Renvoie le nombre de nouveaux messages.
export async function syncInbox(): Promise<{ added: number; enabled: boolean }> {
  const list = await resendGet<{ data: ResendListItem[] }>("/emails/receiving?limit=50");
  if (!list) return { added: 0, enabled: Boolean(process.env.RESEND_API_KEY) };

  const supabase = await createClient();
  const ids = list.data.map((m) => m.id);
  if (!ids.length) return { added: 0, enabled: true };
  const { data: known } = await supabase.from("inbox_messages").select("resend_id").in("resend_id", ids);
  const seen = new Set((known ?? []).map((k) => k.resend_id));
  const fresh = list.data.filter((m) => !seen.has(m.id)).slice(0, 25);

  const rows = (
    await Promise.all(
      fresh.map(async (item) => {
        const full = await resendGet<ResendEmail>(`/emails/receiving/${item.id}`);
        if (!full) return null;
        // Passé par le groupe Google, l'expéditeur devient « X via contact <contact@…> » : le vrai client est dans Reply-To.
        const from = parseAddress(full.from);
        const replyTo = parseAddress(full.reply_to?.[0]);
        const contact = from && !from.email.endsWith(OUR_DOMAIN) ? from : (replyTo ?? from);
        if (!contact) return null;
        return {
          resend_id: full.id,
          direction: "in" as const,
          thread_key: threadKey(contact.email, full.subject ?? ""),
          contact_email: contact.email,
          contact_name: contact.name ?? from?.name ?? null,
          subject: (full.subject ?? "").slice(0, 500),
          text_body: full.text?.slice(0, 200000) ?? null,
          html_body: full.html?.slice(0, 1000000) ?? null,
          attachments: (full.attachments ?? []).map(({ id, filename, content_type, size }) => ({ id, filename, content_type, size })),
          message_id: full.message_id ?? null,
          received_at: full.created_at,
        };
      }),
    )
  ).filter((r) => r !== null);

  if (rows.length) {
    const { error } = await supabase.from("inbox_messages").upsert(rows, { onConflict: "resend_id", ignoreDuplicates: true });
    if (error) {
      console.error("Boîte de réception :", error.message);
      return { added: 0, enabled: true };
    }
  }
  return { added: rows.length, enabled: true };
}

export async function getInboxMessages(limit = 500) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("inbox_messages").select("*").order("received_at", { ascending: false }).limit(limit);
  if (error) console.error("Boîte de réception :", error.message);
  return (data ?? []) as InboxMessage[];
}

export async function getThread(key: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("inbox_messages").select("*").eq("thread_key", key).order("received_at");
  if (error) console.error("Conversation :", error.message);
  return (data ?? []) as InboxMessage[];
}
