import { createClient, getUser } from "@/lib/supabase/server";

// Articles mis en favoris par le client connecté (vide s'il n'est pas connecté).
export async function getFavoriteSlugs(): Promise<Set<string>> {
  const user = await getUser();
  if (!user) return new Set();
  const supabase = await createClient();
  // Filtre explicite : un admin peut lire les favoris de tout le monde.
  const { data } = await supabase.from("favorites").select("product_slug").eq("user_id", user.id);
  return new Set((data ?? []).map((f) => f.product_slug as string));
}
