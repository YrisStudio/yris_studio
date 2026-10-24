"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { products } from "@/lib/site";

export type FavoriteResult = { ok: true; favorite: boolean } | { ok: false; needLogin?: boolean };

export async function toggleFavorite(slug: string, favorite: boolean): Promise<FavoriteResult> {
  if (!products.some((p) => p.slug === slug)) return { ok: false };
  const user = await getUser();
  if (!user) return { ok: false, needLogin: true };

  const supabase = await createClient();
  const { error } = favorite
    ? await supabase.from("favorites").upsert({ user_id: user.id, product_slug: slug }, { ignoreDuplicates: true })
    : await supabase.from("favorites").delete().eq("user_id", user.id).eq("product_slug", slug);
  if (error) {
    console.error("Favoris :", error.message);
    return { ok: false };
  }

  revalidatePath("/compte");
  return { ok: true, favorite };
}
