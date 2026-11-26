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

// Communication (Paramètres → Emails) : textes des emails de statut, réponses toutes faites,
// lien vers les avis Google et message de relance des clients.
export type CannedReply = { title: string; body: string };
export type CommSettings = {
  templates: Record<string, { title: string; message: string }>;
  replies: CannedReply[];
  reviewUrl: string;
  winBack: string;
};

export const defaultComm: CommSettings = {
  templates: {},
  replies: [
    { title: "Merci, devis en cours", body: "Bonjour {prénom},\n\nMerci pour votre message ! On regarde votre demande et on vous envoie un devis sous 24 à 48 h.\n\nÀ très vite,\nL'équipe Yris Studio" },
    { title: "Besoin de mesures", body: "Bonjour {prénom},\n\nPour recréer la pièce au plus juste, pourriez-vous nous envoyer deux ou trois photos avec une règle à côté, et les mesures principales (longueur, largeur, épaisseur) ?\n\nMerci !\nL'équipe Yris Studio" },
    { title: "Commande prête au retrait", body: "Bonjour {prénom},\n\nVotre commande est prête ! Vous pouvez venir la récupérer quand vous voulez, dites-nous simplement le jour qui vous arrange.\n\nL'équipe Yris Studio" },
  ],
  reviewUrl: "",
  winBack: "ça fait un moment qu'on n'a pas eu de vos nouvelles ! L'atelier a de nouvelles pièces et de nouvelles couleurs. Voici un petit code de réduction pour votre prochaine commande.",
};

export function sanitizeComm(raw: unknown): CommSettings {
  const r = (raw ?? {}) as Partial<CommSettings>;
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const templates: CommSettings["templates"] = {};
  for (const [k, v] of Object.entries(r.templates ?? {})) {
    const t = v as { title?: unknown; message?: unknown };
    if (text(t?.title, 120) && text(t?.message, 1000)) templates[k] = { title: text(t.title, 120), message: text(t.message, 1000) };
  }
  const replies = Array.isArray(r.replies)
    ? r.replies.map((x) => ({ title: text((x as CannedReply)?.title, 80), body: text((x as CannedReply)?.body, 4000) })).filter((x) => x.title && x.body).slice(0, 30)
    : defaultComm.replies;
  const reviewUrl = /^https:\/\/[\w.-]+\//.test(text(r.reviewUrl, 400)) ? text(r.reviewUrl, 400) : "";
  return { templates, replies, reviewUrl, winBack: text(r.winBack, 1000) || defaultComm.winBack };
}

export async function getComm(): Promise<CommSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("admin_settings").select("value").eq("key", "communication").maybeSingle();
  return sanitizeComm(data?.value);
}
