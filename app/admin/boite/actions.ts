"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { sendInboxReply } from "@/lib/email";
import { inboxStatuses, team } from "@/lib/inbox";
import { getThread } from "@/lib/inbox-server";
import { createClient, getUser } from "@/lib/supabase/server";

export type InboxState = { status: "idle" | "success" | "error"; message?: string };

export async function setThreadStatus(key: string, status: string): Promise<InboxState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  if (!(inboxStatuses as readonly string[]).includes(status)) return { status: "error", message: "Statut inconnu." };
  const supabase = await createClient();
  const { error } = await supabase.from("inbox_messages").update({ status }).eq("thread_key", key);
  if (error) return { status: "error", message: "Impossible de changer le statut." };
  revalidatePath("/admin", "layout");
  return { status: "success" };
}

export async function assignThread(key: string, who: string): Promise<InboxState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const value = (team as readonly string[]).includes(who) ? who : null;
  const supabase = await createClient();
  const { error } = await supabase.from("inbox_messages").update({ assigned_to: value }).eq("thread_key", key);
  if (error) return { status: "error", message: "Impossible d'assigner." };
  revalidatePath("/admin/boite");
  return { status: "success" };
}

// Répond au client (au nom de contact@) et garde la réponse dans la conversation.
export async function replyThread(key: string, raw: string): Promise<InboxState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const text = raw.trim().slice(0, 20000);
  if (!text) return { status: "error", message: "Le message est vide." };
  const messages = await getThread(key);
  const lastIn = [...messages].reverse().find((m) => m.direction === "in");
  if (!lastIn) return { status: "error", message: "Conversation introuvable." };

  const subject = /^re\s*:/i.test(lastIn.subject) ? lastIn.subject : `Re: ${lastIn.subject || "votre message"}`;
  const id = await sendInboxReply({
    to: lastIn.contact_email,
    subject,
    text,
    inReplyTo: lastIn.message_id,
    key: `reponse-${lastIn.id}-${text.length}-${text.slice(0, 20)}`,
  });
  if (!id) return { status: "error", message: "L'email n'est pas parti (clé Resend manquante ou domaine d'envoi non vérifié)." };

  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from("inbox_messages").insert({
    resend_id: `out-${id}`,
    direction: "out",
    thread_key: key,
    contact_email: lastIn.contact_email,
    contact_name: lastIn.contact_name,
    subject,
    text_body: text,
    status: "en cours",
    assigned_to: lastIn.assigned_to,
    author_email: user?.email ?? null,
  });
  if (error) console.error("Réponse enregistrée :", error.message);
  await supabase.from("inbox_messages").update({ status: "en cours" }).eq("thread_key", key);
  revalidatePath("/admin", "layout");
  return { status: "success", message: "Réponse envoyée" };
}
