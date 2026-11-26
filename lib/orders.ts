import { createClient } from "@/lib/supabase/server";
import type { QuoteInputs, QuoteLine } from "@/lib/pricing";

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
  customer_company: string | null;
  phone: string | null;
  delivery: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string | null;
  priority: "normale" | "urgente" | null;
  due_date: string | null;
  lines: QuoteLine[] | null;
  quote_inputs: Partial<QuoteInputs> | null;
  quote_number: string | null;
  quote_date: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  payment: "en attente" | "payée" | "abandonnée" | null;
  paid_at: string | null;
};

export type OrderEvent = {
  id: string;
  order_id: string;
  kind: "creation" | "statut" | "note" | "devis" | "email";
  body: string;
  author_email: string | null;
  created_at: string;
};

// Toutes les commandes. La base ne les renvoie que si la personne connectée est admin.
export async function getAllOrders() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    // Paniers partis payer sans jamais payer : pas des vraies commandes.
    .or("payment.is.null,payment.eq.payée")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) console.error("Admin commandes :", error.message);
  return (data ?? []) as AdminOrder[];
}

export async function getOrder(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) console.error("Admin commande :", error.message);
  return (data as AdminOrder | null) ?? null;
}

export async function getOrderEvents(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_events")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) console.error("Historique commande :", error.message);
  return (data ?? []) as OrderEvent[];
}

// Montant retenu pour le chiffre d'affaires : le prix final s'il est fixé, sinon l'estimation.
export const orderAmount = (o: Pick<AdminOrder, "final_cents" | "estimated_cents">) => o.final_cents ?? o.estimated_cents ?? 0;

export const isOpen = (status: string) => status !== "terminée" && status !== "annulée";

// En retard : date promise dépassée et commande toujours en cours.
export const isLate = (o: Pick<AdminOrder, "due_date" | "status">) =>
  Boolean(o.due_date) && isOpen(o.status) && new Date(`${o.due_date}T23:59:59`) < new Date();
