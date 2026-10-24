"use server";

import { reportCategories } from "@/lib/site";
import { authEnabled, createClient, getUser } from "@/lib/supabase/server";

export type ReportState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<"name" | "email" | "message", string>>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  // Champ piège invisible : un humain le laisse vide, un robot le remplit.
  if (String(formData.get("site_web") ?? "")) return { status: "success" };

  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const name = get("name").slice(0, 100);
  const email = get("email").toLowerCase();
  const category = reportCategories.find((c) => c.id === get("category"))?.id ?? "autre";
  const orderRef = get("order_ref").replace(/^#/, "").toUpperCase().slice(0, 20);
  const message = get("message");

  const errors: ReportState["errors"] = {};
  if (name.length < 2) errors.name = "Indiquez votre nom.";
  if (!EMAIL_RE.test(email) || email.length > 200) errors.email = "Cette adresse email ne semble pas valide.";
  if (message.length < 10 || message.length > 5000) errors.message = "Décrivez le problème en quelques phrases (10 caractères minimum).";
  if (Object.keys(errors).length) return { status: "error", errors };

  let saved = false;
  if (authEnabled) {
    const user = await getUser();
    const supabase = await createClient();
    const { error } = await supabase.from("reports").insert({
      user_id: user?.id ?? null,
      name,
      email,
      category,
      order_ref: orderRef || null,
      message,
    });
    if (error) console.error("Signalement : enregistrement impossible", error.message);
    saved = !error;
  }

  // Copie par email, si l'envoi d'emails est configuré.
  let emailed = false;
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (apiKey && to) {
    const label = reportCategories.find((c) => c.id === category)!.label;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL ?? "Yris <onboarding@resend.dev>",
        to: [to],
        reply_to: email,
        subject: `Signalement (${label}) : ${name}`,
        html: `<p><b>Sujet :</b> ${escapeHtml(label)}<br><b>Nom :</b> ${escapeHtml(name)}<br><b>Email :</b> ${escapeHtml(email)}${
          orderRef ? `<br><b>Commande :</b> #${escapeHtml(orderRef)}` : ""
        }</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
      }),
    });
    emailed = res.ok;
    if (!res.ok) console.error("Signalement : échec Resend", res.status, await res.text());
  }

  if (!saved && !emailed) {
    return { status: "error", message: "Le message n'a pas pu partir. Réessayez dans un instant." };
  }
  return { status: "success" };
}
