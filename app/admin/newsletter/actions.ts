"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { getMe, isManager } from "@/lib/admin";
import { sendNewsletter } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

export type NewsletterSendState = { status: "idle" | "success" | "error"; message?: string };

// Envoie la newsletter : à soi-même d'abord (« test »), puis à tous les inscrits.
export async function sendNewsletterAction(_prev: NewsletterSendState, formData: FormData): Promise<NewsletterSendState> {
  if (!(await isManager())) return { status: "error", message: "Réservé aux gérants." };
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 150);
  const body = String(formData.get("body") ?? "").trim().slice(0, 8000);
  const test = formData.get("mode") === "test";
  if (subject.length < 3 || body.length < 10) return { status: "error", message: "Écris un objet et un message." };

  const supabase = await createClient();
  let recipients: { email: string; token: string }[];
  if (test) {
    const me = await getMe();
    if (!me?.email) return { status: "error", message: "Adresse introuvable." };
    recipients = [{ email: me.email, token: "00000000-0000-0000-0000-000000000000" }];
  } else {
    const { data } = await supabase.from("newsletter_subscribers").select("email, token").is("unsubscribed_at", null);
    recipients = (data ?? []) as { email: string; token: string }[];
    if (!recipients.length) return { status: "error", message: "Personne n'est encore inscrit." };
  }
  const sent = await sendNewsletter({ subject, body, recipients });
  if (!sent) return { status: "error", message: "Envoi impossible (Resend)." };
  if (!test) {
    await logActivity(`a envoyé la newsletter à ${sent} abonné(s)`, subject, "/admin/newsletter");
    revalidatePath("/admin/newsletter");
  }
  return { status: "success", message: test ? "Test envoyé sur votre adresse." : `Newsletter envoyée à ${sent} abonné(s).` };
}

export async function removeSubscriber(email: string) {
  if (!(await isManager())) return;
  const supabase = await createClient();
  await supabase.from("newsletter_subscribers").delete().eq("email", email);
  revalidatePath("/admin/newsletter");
}
