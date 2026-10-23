"use server";

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<"name" | "email" | "message", string>>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Champ piège invisible : un humain le laisse vide, un robot le remplit.
  if (String(formData.get("site_web") ?? "")) return { status: "success" };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const plan = String(formData.get("formule") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  const errors: ContactState["errors"] = {};
  if (name.length < 2 || name.length > 100) errors.name = "Indiquez votre nom.";
  if (!EMAIL_RE.test(email) || email.length > 200) errors.email = "Cette adresse email ne semble pas valide.";
  if (message.length < 10 || message.length > 5000)
    errors.message = "Décrivez votre projet en quelques phrases (10 caractères minimum).";
  if (Object.keys(errors).length) return { status: "error", errors };

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    console.error("Formulaire de contact : RESEND_API_KEY ou CONTACT_TO_EMAIL manquant.");
    return { status: "error", message: "L'envoi est momentanément indisponible. Écrivez-nous directement par email." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL ?? "Yris Studio <onboarding@resend.dev>",
      to: [to],
      reply_to: email,
      subject: `Nouveau projet : ${name}${plan ? ` (${plan})` : ""}`,
      text: `Nom : ${name}\nEmail : ${email}\nFormule : ${plan || "non précisée"}\n\n${message}`,
      html: `<p><b>Nom :</b> ${escapeHtml(name)}<br><b>Email :</b> ${escapeHtml(email)}<br><b>Formule :</b> ${escapeHtml(
        plan || "non précisée",
      )}</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
    }),
  });

  if (!res.ok) {
    console.error("Formulaire de contact : échec Resend", res.status, await res.text());
    return { status: "error", message: "Le message n'a pas pu partir. Réessayez dans un instant." };
  }

  return { status: "success" };
}
