import { sanitizeCompany, type Company } from "@/lib/company";
import { createServiceClient } from "@/lib/supabase/service";

// Infos de l'entreprise pour les pages légales publiques (mentions légales, CGV, confidentialité).
// Les réglages ne sont lisibles que par l'équipe : on passe par la clé serveur, et on ne
// renvoie que la fiche entreprise. Sans clé (dev local), on garde les valeurs par défaut.
export async function getPublicCompany(): Promise<Company> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase.from("admin_settings").select("value").eq("key", "company").maybeSingle();
    return sanitizeCompany(data?.value);
  } catch {
    return sanitizeCompany(null);
  }
}

export const fullAddress = (c: Company) => [c.address, [c.postalCode, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

export const legalLinks = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgv", label: "Conditions générales de vente" },
  { href: "/confidentialite", label: "Confidentialité" },
];

// Date de la dernière mise à jour des textes, affichée en haut de chaque page.
export const LEGAL_UPDATED = "27 novembre 2026";
