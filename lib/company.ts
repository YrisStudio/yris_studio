// Infos de l'entreprise (Paramètres) : utilisées sur les devis et factures. Sans dépendance serveur.
import { site } from "@/lib/site";

export const companyFields = [
  { key: "name", label: "Nom commercial", placeholder: "Yris Studio" },
  { key: "legalName", label: "Raison sociale / nom", placeholder: "Nom de l'entrepreneur ou de la société" },
  { key: "status", label: "Statut", placeholder: "Micro-entreprise, SAS…" },
  { key: "siret", label: "SIRET", placeholder: "123 456 789 00012" },
  { key: "vat", label: "TVA", placeholder: "TVA non applicable, art. 293 B du CGI" },
  { key: "address", label: "Adresse", placeholder: "N° et rue" },
  { key: "postalCode", label: "Code postal", placeholder: "75000" },
  { key: "city", label: "Ville", placeholder: "Paris" },
  { key: "email", label: "Email", placeholder: site.email },
  { key: "phone", label: "Téléphone", placeholder: "06 00 00 00 00" },
  { key: "website", label: "Site", placeholder: "yris-studio.com" },
  { key: "paymentTerms", label: "Conditions de paiement", placeholder: "Paiement à la commande" },
] as const;

export type CompanyKey = (typeof companyFields)[number]["key"];
export type Company = Record<CompanyKey, string>;

export const defaultCompany: Company = {
  name: "Yris Studio",
  legalName: "",
  status: "",
  siret: "",
  vat: "TVA non applicable, art. 293 B du CGI",
  address: "",
  postalCode: "",
  city: "",
  email: site.email,
  phone: "",
  website: "yris-studio.com",
  paymentTerms: "Paiement à la commande",
};

export function sanitizeCompany(raw: unknown): Company {
  const r = (raw ?? {}) as Partial<Record<CompanyKey, unknown>>;
  return Object.fromEntries(
    companyFields.map(({ key }) => [key, typeof r[key] === "string" ? String(r[key]).trim().slice(0, 200) : defaultCompany[key]]),
  ) as Company;
}
