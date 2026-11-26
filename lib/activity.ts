import { getMe } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export type Activity = { id: string; actor: string | null; action: string; target: string | null; link: string | null; created_at: string };

// Note une action de l'équipe dans le journal (« Johann a passé #A12 en impression »).
// Ne bloque jamais l'action elle-même : une erreur ici est seulement écrite dans les logs.
export async function logActivity(action: string, target?: string | null, link?: string | null) {
  try {
    const [me, supabase] = await Promise.all([getMe(), createClient()]);
    const { error } = await supabase
      .from("admin_activity")
      .insert({ actor: me?.name ?? null, action: action.slice(0, 300), target: target?.slice(0, 200) ?? null, link: link ?? null });
    if (error) console.error("Journal :", error.message);
  } catch (e) {
    console.error("Journal :", e instanceof Error ? e.message : e);
  }
}

export async function getActivity(limit = 200): Promise<Activity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("admin_activity").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) console.error("Journal :", error.message);
  return (data ?? []) as Activity[];
}
