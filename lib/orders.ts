import { createClient } from "@/lib/supabase/server";

export type AdminOrder = {
  id: string;
  user_id: string | null;
  kind: string;
  product_slug: string | null;
  product_name: string | null;
  quantity: number;
  material: string | null;
  details: string | null;
  files: string[];
  estimated_cents: number | null;
  final_cents: number | null;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  phone: string | null;
  delivery: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string | null;
};

// Toutes les commandes. La base ne les renvoie que si la personne connectée est admin.
export async function getAllOrders() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) console.error("Admin commandes :", error.message);
  return (data ?? []) as AdminOrder[];
}

// Montant retenu pour le chiffre d'affaires : le prix final s'il est fixé, sinon l'estimation.
export const orderAmount = (o: Pick<AdminOrder, "final_cents" | "estimated_cents">) => o.final_cents ?? o.estimated_cents ?? 0;

export const isOpen = (status: string) => status !== "terminée" && status !== "annulée";
