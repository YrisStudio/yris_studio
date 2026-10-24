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
