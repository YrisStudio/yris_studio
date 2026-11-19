"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { reportStatuses } from "@/lib/reports";
import { createClient, getUser } from "@/lib/supabase/server";

export type SavState = { status: "idle" | "success" | "error"; message?: string };

const ok = (message?: string): SavState => ({ status: "success", message });
const fail = (message: string): SavState => ({ status: "error", message });
const refresh = () => {
  revalidatePath("/admin/sav");
  revalidatePath("/admin/atelier");
};

export async function setReportStatus(id: string, status: string): Promise<SavState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  if (!(reportStatuses as readonly string[]).includes(status)) return fail("Statut inconnu.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({ status, handled_at: status === "traité" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) {
    console.error("SAV :", error.message);
    return fail("Impossible de changer le statut.");
  }
  refresh();
  return ok();
}

// Ce qui a été fait pour le client (note interne, jamais envoyée).
export async function saveResolution(id: string, _prev: SavState, formData: FormData): Promise<SavState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const resolution = String(formData.get("resolution") ?? "").trim().slice(0, 4000) || null;
  const supabase = await createClient();
  const { error } = await supabase.from("reports").update({ resolution }).eq("id", id);
  if (error) {
    console.error("SAV :", error.message);
    return fail("Impossible d'enregistrer.");
  }
  refresh();
  return ok("Enregistré");
}

// Réimpression gratuite : la commande concernée repart dans la file de l'atelier, liée au signalement.
export async function launchReprint(reportId: string, orderId: string): Promise<SavState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("orders")
    .select("id, product_name, details, material, quantity, quote_inputs")
    .eq("id", orderId)
    .maybeSingle();
  if (!o) return fail("Commande introuvable.");
  const q = (o.quote_inputs ?? {}) as { label?: string; grams?: number; hours?: number; quantity?: number; material?: string };
  const hours = Number(q.hours ?? 0);
  if (!hours) return fail("La commande n'a pas de devis calculé : ajoutez l'impression à la main dans l'atelier.");

  const { data: last } = await supabase
    .from("print_jobs")
    .select("position")
    .eq("status", "à faire")
    .is("printer_id", null)
    .order("position", { ascending: false })
    .limit(1);
  const title = `Réimpression · ${(q.label || o.product_name || o.details?.split("\n")[0] || "pièce").slice(0, 100)}`;
  const { error } = await supabase.from("print_jobs").insert({
    order_id: o.id,
    report_id: reportId,
    title,
    material: q.material ?? o.material,
    grams: Number(q.grams ?? 0),
    hours,
    quantity: Number(q.quantity ?? o.quantity ?? 1),
    position: (last?.[0]?.position ?? -1) + 1,
  });
  if (error) {
    console.error("Réimpression :", error.message);
    return fail("Impossible de lancer la réimpression.");
  }
  const user = await getUser();
  await supabase
    .from("order_events")
    .insert({ order_id: o.id, kind: "statut", body: "Réimpression gratuite lancée (SAV)", author_email: user?.email ?? null });
  await supabase.from("reports").update({ status: "en cours" }).eq("id", reportId).eq("status", "nouveau");
  refresh();
  revalidatePath(`/admin/commandes/${o.id}`);
  return ok("Réimpression ajoutée à la file de l'atelier");
}
