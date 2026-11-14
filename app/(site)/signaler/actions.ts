"use server";

import { notifyOwner } from "@/lib/email";
import { reportCategories } from "@/lib/site";
import { authEnabled, createClient, getUser } from "@/lib/supabase/server";

export type ReportState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<"name" | "email" | "message", string>>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


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
  const label = reportCategories.find((c) => c.id === category)!.label;
  const emailed = await notifyOwner({
    subject: `Signalement (${label}) : ${name}`,
    replyTo: email,
    body: message,
    rows: [
      ["Sujet", label],
      ["Nom", name],
      ["Email", email],
      ...(orderRef ? ([["Commande", `#${orderRef}`]] as [string, string][]) : []),
    ],
  });

  if (!saved && !emailed) {
    return { status: "error", message: "Le message n'a pas pu partir. Réessayez dans un instant." };
  }
  return { status: "success" };
}
