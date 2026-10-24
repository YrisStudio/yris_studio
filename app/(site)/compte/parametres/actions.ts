"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient, getUser } from "@/lib/supabase/server";

export type SettingsState = { status: "idle" | "success" | "error"; message?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const notLogged: SettingsState = { status: "error", message: "Votre session a expiré. Reconnectez-vous." };

export async function updateName(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getUser();
  if (!user) return notLogged;
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 40) return { status: "error", message: "Entre 2 et 40 caractères." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
  if (error) return { status: "error", message: "Impossible d'enregistrer. Réessayez dans un instant." };
  revalidatePath("/compte", "layout");
  return { status: "success", message: "Prénom mis à jour." };
}

export async function updateEmail(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getUser();
  if (!user) return notLogged;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { status: "error", message: "Cette adresse email ne semble pas valide." };
  if (email === user.email) return { status: "error", message: "C'est déjà votre adresse actuelle." };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${origin}/auth/confirm?next=/compte/parametres` },
  );
  if (error) {
    const taken = /already|registered|exists/i.test(error.message);
    return { status: "error", message: taken ? "Cette adresse est déjà utilisée par un autre compte." : "Impossible de changer l'email. Réessayez dans un instant." };
  }
  return {
    status: "success",
    message: `Lien de confirmation envoyé à ${email}. L'adresse changera dès que vous l'aurez validé.`,
  };
}

export async function updatePassword(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getUser();
  if (!user?.email) return notLogged;
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 8) return { status: "error", message: "Le nouveau mot de passe doit faire au moins 8 caractères." };
  if (next !== confirm) return { status: "error", message: "Les deux mots de passe ne correspondent pas." };
  if (next === current) return { status: "error", message: "Choisissez un mot de passe différent de l'actuel." };

  const supabase = await createClient();
  // On vérifie l'ancien mot de passe avant d'accepter le nouveau.
  const { error: wrong } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (wrong) return { status: "error", message: "Mot de passe actuel incorrect." };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { status: "error", message: "Ce mot de passe n'est pas accepté. Essayez-en un plus long." };
  return { status: "success", message: "Mot de passe modifié." };
}
