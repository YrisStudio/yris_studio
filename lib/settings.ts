import { sanitizeCompany, type Company } from "@/lib/company";
import { sanitizeTariffs, type Tariffs } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

// Tarifs de l'atelier, enregistrés dans admin_settings (clé « tariffs »). Valeurs par défaut sinon.
export async function getTariffs(): Promise<Tariffs> {
  const supabase = await createClient();
  const { data } = await supabase.from("admin_settings").select("value").eq("key", "tariffs").maybeSingle();
  return sanitizeTariffs(data?.value);
}

// Infos de l'entreprise (admin_settings, clé « company »).
export async function getCompany(): Promise<Company> {
  const supabase = await createClient();
  const { data } = await supabase.from("admin_settings").select("value").eq("key", "company").maybeSingle();
  return sanitizeCompany(data?.value);
}
