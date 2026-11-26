"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { isAdmin } from "@/lib/admin";
import { sendWinBack } from "@/lib/email";
import { getComm } from "@/lib/settings";
import { clientKey } from "@/lib/clients";
import { createClient, getUser } from "@/lib/supabase/server";

export type ClientState = { status: "idle" | "success" | "error"; message?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ok = (message?: string): ClientState => ({ status: "success", message });
const fail = (message: string): ClientState => ({ status: "error", message });

function refresh(email: string) {
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientKey(email)}`);
}

// Infos de la fiche (nom, société, téléphone) et statut de client pro avec sa remise.
export async function saveClient(rawEmail: string, _prev: ClientState, formData: FormData): Promise<ClientState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return fail("Email invalide.");
  const discount = Number(String(formData.get("pro_discount_pct") ?? "0").replace(",", "."));
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) return fail("Remise invalide (0 à 100 %).");

  const supabase = await createClient();
  const { error } = await supabase.from("clients").upsert(
    {
      email,
      name: String(formData.get("name") ?? "").trim().slice(0, 120) || null,
      company: String(formData.get("company") ?? "").trim().slice(0, 120) || null,
      phone: String(formData.get("phone") ?? "").trim().slice(0, 40) || null,
      is_pro: formData.get("is_pro") === "on",
      pro_discount_pct: formData.get("is_pro") === "on" ? discount : 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );
  if (error) {
    console.error("Client :", error.message);
    return fail("Impossible d'enregistrer la fiche.");
  }
  refresh(email);
  return ok("Fiche enregistrée");
}

export async function setClientTags(rawEmail: string, tags: string[]): Promise<ClientState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const email = rawEmail.trim().toLowerCase();
  const clean = [...new Set(tags.map((t) => t.trim().slice(0, 30)).filter(Boolean))].slice(0, 12);
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .upsert({ email, tags: clean, updated_at: new Date().toISOString() }, { onConflict: "email" });
  if (error) {
    console.error("Étiquettes :", error.message);
    return fail("Impossible d'enregistrer les étiquettes.");
  }
  refresh(email);
  return ok();
}

export async function addClientNote(rawEmail: string, _prev: ClientState, formData: FormData): Promise<ClientState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const email = rawEmail.trim().toLowerCase();
  const body = String(formData.get("note") ?? "").trim().slice(0, 4000);
  if (!body) return fail("Écrivez la note.");
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from("client_notes").insert({ client_email: email, body, author_email: user?.email ?? null });
  if (error) {
    console.error("Note client :", error.message);
    return fail("Impossible d'ajouter la note.");
  }
  refresh(email);
  return ok("Note ajoutée");
}

export async function deleteClientNote(id: string, rawEmail: string): Promise<ClientState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  const { error } = await supabase.from("client_notes").delete().eq("id", id);
  if (error) return fail("Impossible de supprimer la note.");
  refresh(rawEmail.trim().toLowerCase());
  return ok();
}

// Relance d'un client inactif : email avec un code de réduction personnel (10 %, 60 jours, une fois).
export async function winBackClient(rawEmail: string): Promise<{ status: "success" | "error"; message: string }> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };
  const email = rawEmail.trim().toLowerCase();
  const supabase = await createClient();
  const { data: last } = await supabase.from("orders").select("customer_name").ilike("customer_email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const comm = await getComm();
  const code = `RETOUR-${crypto.randomUUID().slice(0, 5).toUpperCase()}`;
  const expires = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 60)).toISOString().slice(0, 10);
  const { error } = await supabase.from("promo_codes").insert({ code, kind: "pourcent", value: 10, max_uses: 1, expires_on: expires, note: `Relance ${email}` });
  if (error) return { status: "error", message: "Impossible de créer le code." };
  const sent = await sendWinBack({ to: email, name: last?.customer_name ?? null, message: comm.winBack, code });
  if (!sent) return { status: "error", message: "Email non envoyé (Resend)." };
  const user = await getUser();
  await supabase.from("client_notes").insert({ client_email: email, body: `Relance envoyée avec le code ${code} (−10 %, jusqu'au ${expires}).`, author_email: user?.email ?? null });
  await logActivity(`a relancé un client (code ${code})`, email, `/admin/clients/${clientKey(email)}`);
  refresh(email);
  revalidatePath("/admin/clients");
  return { status: "success", message: `Relance envoyée (code ${code})` };
}
