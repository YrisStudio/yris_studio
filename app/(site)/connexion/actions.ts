"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authEnabled, createClient, safeNext } from "@/lib/supabase/server";

export type AuthState = {
  status: "idle" | "error" | "check-email";
  message?: string;
  email?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Traduit les erreurs Supabase les plus courantes.
function frenchError(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "Email ou mot de passe incorrect.";
  if (/email not confirmed/i.test(msg)) return "Confirmez d'abord votre email avec le lien que nous vous avons envoyé.";
  if (/already registered|already exists/i.test(msg)) return "Un compte existe déjà avec cet email. Connectez-vous.";
  if (/rate limit/i.test(msg)) return "Trop de tentatives. Réessayez dans quelques minutes.";
  if (/password/i.test(msg)) return "Ce mot de passe n'est pas accepté. Utilisez au moins 8 caractères.";
  return "Une erreur est survenue. Réessayez dans un instant.";
}

export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!authEnabled) return { status: "error", message: "Les comptes ne sont pas encore activés sur ce site." };

  const mode = formData.get("mode") === "inscription" ? "inscription" : "connexion";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const next = safeNext(formData.get("next"));

  if (!EMAIL_RE.test(email)) return { status: "error", message: "Cette adresse email ne semble pas valide.", email };
  if (password.length < 8) return { status: "error", message: "Le mot de passe doit faire au moins 8 caractères.", email };
  if (mode === "inscription" && name.length < 2) return { status: "error", message: "Indiquez votre nom.", email };

  const supabase = await createClient();

  if (mode === "connexion") {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { status: "error", message: frenchError(error.message), email };
    redirect(next);
  }

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { status: "error", message: frenchError(error.message), email };

  // Si la confirmation par email est désactivée dans Supabase, on est directement connecté.
  if (data.session) redirect(next);
  return { status: "check-email", email };
}

export async function signOut() {
  if (authEnabled) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
