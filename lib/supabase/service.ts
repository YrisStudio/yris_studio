import { createClient } from "@supabase/supabase-js";

// Accès complet à la base, sans compte connecté. Réservé au webhook Stripe, qui doit
// marquer une commande comme payée : jamais importé par une page ni un composant.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
