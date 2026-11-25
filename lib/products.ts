import { cache } from "react";
import { authEnabled, createClient } from "@/lib/supabase/server";
import type { Category, Product } from "@/lib/site";

// Articles de la boutique, lus dans la table products (gérée dans Gestionnaire → Produits).

export const PHOTO_BUCKET = "produits";
export const photoUrl = (path: string) =>
  path.startsWith("http") ? path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  price_cents: number | null;
  material: string;
  summary: string;
  description: string;
  photos: string[];
  colors: string[];
  lead_days: number;
  active: boolean;
  featured: boolean;
  position: number;
};

export const productColumns = "id, slug, name, category, price_cents, material, summary, description, photos, colors, lead_days, active, featured, position";

export const toProduct = (r: ProductRow): Product => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  category: r.category,
  priceCents: r.price_cents,
  material: r.material,
  text: r.summary,
  description: r.description,
  photos: (r.photos ?? []).map(photoUrl),
  colors: r.colors ?? [],
  leadDays: r.lead_days,
  active: r.active,
  featured: r.featured,
  position: r.position,
});

// Articles en vente, dans l'ordre choisi. Mis en cache le temps d'une requête.
export const getProducts = cache(async (): Promise<Product[]> => {
  if (!authEnabled) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select(productColumns).eq("active", true).order("position").order("name");
  if (error) console.error("Produits :", error.message);
  return ((data ?? []) as ProductRow[]).map(toProduct);
});

export async function getProduct(slug: string): Promise<Product | null> {
  return (await getProducts()).find((p) => p.slug === slug) ?? null;
}
