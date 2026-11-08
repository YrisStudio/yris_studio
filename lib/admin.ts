import { notFound } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";

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
