import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Invite, Member, Role } from "@/lib/team";

// Vrai si la personne connectée est administratrice (vérifié par la base, fonction is_admin).
export async function isAdmin() {
  const user = await getUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  return data === true;
}

// À appeler en tête de chaque page /admin : un non-admin obtient une simple page 404.
export async function requireAdmin() {
  if (!(await isAdmin())) notFound();
}

// Membre de l'équipe connecté (prénom, rôle), ou null. Mis en cache le temps d'une requête.
export const getMe = cache(async (): Promise<Member | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("admins").select("user_id, name, email, role").eq("user_id", user.id).maybeSingle();
  if (!data) return null;
  return { userId: data.user_id, name: data.name || user.email?.split("@")[0] || "Moi", email: data.email ?? user.email ?? "", role: data.role as Role };
});

export const isManager = async () => (await getMe())?.role === "gérant";

// Pages réservées aux gérants (Paramètres, équipe).
export async function requireManager() {
  if (!(await isManager())) notFound();
}

// Toute l'équipe, par ordre d'arrivée.
export async function getTeam(): Promise<Member[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("admins").select("user_id, name, email, role").order("created_at");
  return (data ?? []).map((m) => ({ userId: m.user_id, name: m.name || m.email?.split("@")[0] || "?", email: m.email ?? "", role: m.role as Role }));
}

export async function getInvites(): Promise<Invite[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("admin_invites").select("email, name, role, created_at").order("created_at");
  return (data ?? []) as Invite[];
}

// Date de remise à zéro des chiffres (Paramètres). Les commandes terminées avant ne comptent plus
// dans le chiffre d'affaires ; elles restent visibles dans la liste des commandes.
export async function getStatsResetAt(): Promise<Date | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("admin_settings").select("value").eq("key", "stats_reset_at").maybeSingle();
  return typeof data?.value === "string" ? new Date(data.value) : null;
}

// Vrai si la commande terminée compte dans les chiffres (terminée après la remise à zéro).
export function countsInStats(o: { status: string; created_at: string; updated_at: string | null }, resetAt: Date | null) {
  if (o.status !== "terminée") return false;
  return !resetAt || new Date(o.updated_at ?? o.created_at) >= resetAt;
}
