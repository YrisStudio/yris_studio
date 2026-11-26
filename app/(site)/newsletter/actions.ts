"use server";

import { authEnabled, createClient } from "@/lib/supabase/server";

export type NewsletterState = { status: "idle" | "success" | "error"; message?: string };

export async function subscribeNewsletter(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  if (String(formData.get("site_web") ?? "")) return { status: "success" };
  if (!authEnabled) return { status: "error", message: "Inscription indisponible pour l'instant." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) return { status: "error", message: "Cette adresse email ne semble pas valide." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("newsletter_subscribe", { p_email: email, p_source: "site" });
  if (error) {
    console.error("Newsletter :", error.message);
    return { status: "error", message: "Inscription impossible, réessayez." };
  }
  return { status: "success" };
}
