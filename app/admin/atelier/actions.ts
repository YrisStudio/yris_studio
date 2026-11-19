"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { jobDurationMs, printerModels } from "@/lib/atelier";
import { quoteMaterials } from "@/lib/pricing";
import { moveFilament, pickSpool } from "@/lib/stock-server";
import { createClient, getUser } from "@/lib/supabase/server";

export type AtelierState = { status: "idle" | "success" | "error"; message?: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;
const ok = (message?: string): AtelierState => ({ status: "success", message });
const fail = (message: string): AtelierState => ({ status: "error", message });

function refresh(orderId?: string | null) {
  revalidatePath("/admin/atelier");
  if (orderId) revalidatePath(`/admin/commandes/${orderId}`);
}

const num = (v: FormDataEntryValue | null, min: number, max: number) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

// Note dans l'historique de la commande liée, s'il y en a une.
async function logOrder(supabase: Supabase, orderId: string | null, body: string) {
  if (!orderId) return;
  const user = await getUser();
  await supabase.from("order_events").insert({ order_id: orderId, kind: "statut", body, author_email: user?.email ?? null });
}

async function nextPosition(supabase: Supabase, printerId: string | null) {
  const q = supabase.from("print_jobs").select("position").eq("status", "à faire").order("position", { ascending: false }).limit(1);
  const { data } = await (printerId ? q.eq("printer_id", printerId) : q.is("printer_id", null));
  return (data?.[0]?.position ?? -1) + 1;
}

/* ───────── Imprimantes ───────── */

export async function addPrinter(_prev: AtelierState, formData: FormData): Promise<AtelierState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const model = String(formData.get("model") ?? "");
  const every = num(formData.get("every"), 10, 10000);
  const hours = num(formData.get("hours") || "0", 0, 100000);
  if (!name) return fail("Donnez un nom à l'imprimante (ex. P1S n°1).");
  if (!(printerModels as readonly string[]).includes(model)) return fail("Choisissez le modèle.");
  if (every === null || hours === null) return fail("Vérifiez les heures.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("printers")
    .insert({ name, model, maintenance_every_hours: Math.round(every), hours_total: hours, hours_at_maintenance: hours });
  if (error) {
    console.error("Imprimante :", error.message);
    return fail("Impossible d'ajouter l'imprimante.");
  }
  refresh();
  return ok("Imprimante ajoutée");
}

export async function setPrinterStatus(id: string, status: "active" | "maintenance" | "hors service") {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  const { error } = await supabase.from("printers").update({ status }).eq("id", id);
  if (error) return fail("Impossible de changer l'état.");
  refresh();
  return ok();
}

// Maintenance faite : le compteur repart de zéro.
export async function markMaintenance(id: string) {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  const { data } = await supabase.from("printers").select("hours_total").eq("id", id).maybeSingle();
  if (!data) return fail("Imprimante introuvable.");
  const { error } = await supabase
    .from("printers")
    .update({ hours_at_maintenance: data.hours_total, last_maintenance_at: new Date().toISOString(), status: "active" })
    .eq("id", id);
  if (error) return fail("Impossible d'enregistrer la maintenance.");
  refresh();
  return ok("Maintenance enregistrée");
}

export async function deletePrinter(id: string) {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  // Les impressions de cette imprimante repassent « non assignées ».
  const { error } = await supabase.from("printers").delete().eq("id", id);
  if (error) return fail("Impossible de supprimer l'imprimante.");
  refresh();
  return ok("Imprimante supprimée");
}

/* ───────── Impressions ───────── */

export async function addJob(_prev: AtelierState, formData: FormData): Promise<AtelierState> {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const material = String(formData.get("material") ?? "");
  const grams = num(formData.get("grams") || "0", 0, 100000);
  const hours = num(formData.get("hours") || "0", 0, 1000);
  const quantity = num(formData.get("quantity") || "1", 1, 1000);
  const printerId = String(formData.get("printer") ?? "") || null;
  if (!title) return fail("Indiquez ce qu'il faut imprimer.");
  if (grams === null || hours === null || quantity === null) return fail("Vérifiez les grammes, heures et quantité.");
  if (hours === 0) return fail("Indiquez la durée d'impression (en heures).");

  const supabase = await createClient();
  const { error } = await supabase.from("print_jobs").insert({
    title,
    material: (quoteMaterials as readonly string[]).includes(material) ? material : null,
    grams,
    hours,
    quantity: Math.round(quantity),
    printer_id: printerId,
    position: await nextPosition(supabase, printerId),
  });
  if (error) {
    console.error("Impression :", error.message);
    return fail("Impossible d'ajouter l'impression.");
  }
  refresh();
  return ok("Ajoutée à la file");
}

// Depuis la fiche commande : une impression créée à partir du devis.
export async function addJobFromOrder(orderId: string): Promise<AtelierState> {
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
  if (!hours) return fail("Calculez d'abord le devis : il faut la durée d'impression.");

  const { error } = await supabase.from("print_jobs").insert({
    order_id: o.id,
    title: (q.label || o.product_name || o.details?.split("\n")[0] || "Impression").slice(0, 120),
    material: q.material ?? o.material,
    grams: Number(q.grams ?? 0),
    hours,
    quantity: Number(q.quantity ?? o.quantity ?? 1),
    position: await nextPosition(supabase, null),
  });
  if (error) {
    console.error("Impression :", error.message);
    return fail("Impossible d'ajouter à la file.");
  }
  await logOrder(supabase, o.id, "Ajoutée à la file d'impression");
  refresh(o.id);
  return ok("Ajoutée à la file d'impression");
}

export async function assignJob(id: string, printerId: string | null) {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("print_jobs")
    .update({ printer_id: printerId, position: await nextPosition(supabase, printerId) })
    .eq("id", id)
    .eq("status", "à faire");
  if (error) return fail("Impossible de changer d'imprimante.");
  refresh();
  return ok();
}

// Monte ou descend une impression dans la file de son imprimante.
export async function moveJob(id: string, direction: -1 | 1) {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  const { data: job } = await supabase.from("print_jobs").select("printer_id").eq("id", id).maybeSingle();
  if (!job) return fail("Impression introuvable.");
  const q = supabase.from("print_jobs").select("id, position").eq("status", "à faire").order("position").order("created_at");
  const { data: queue } = await (job.printer_id ? q.eq("printer_id", job.printer_id) : q.is("printer_id", null));
  const list = queue ?? [];
  const i = list.findIndex((j) => j.id === id);
  const k = i + direction;
  if (i < 0 || k < 0 || k >= list.length) return ok();
  [list[i], list[k]] = [list[k], list[i]];
  await Promise.all(list.map((j, n) => supabase.from("print_jobs").update({ position: n }).eq("id", j.id)));
  refresh();
  return ok();
}

export async function startJob(id: string) {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  const { data: job } = await supabase.from("print_jobs").select("printer_id, order_id, title").eq("id", id).maybeSingle();
  if (!job) return fail("Impression introuvable.");
  if (!job.printer_id) return fail("Choisissez d'abord l'imprimante.");
  const { count } = await supabase
    .from("print_jobs")
    .select("id", { count: "exact", head: true })
    .eq("printer_id", job.printer_id)
    .eq("status", "en cours");
  if (count) return fail("Cette imprimante imprime déjà. Terminez d'abord l'impression en cours.");
  const { error } = await supabase
    .from("print_jobs")
    .update({ status: "en cours", started_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return fail("Impossible de lancer l'impression.");
  await logOrder(supabase, job.order_id, `Impression lancée : ${job.title}`);
  refresh(job.order_id);
  return ok("Impression lancée");
}

// Ajoute le temps réellement passé au compteur de l'imprimante.
async function addPrinterHours(supabase: Supabase, printerId: string | null, hours: number) {
  if (!printerId || hours <= 0) return;
  const { data } = await supabase.from("printers").select("hours_total").eq("id", printerId).maybeSingle();
  if (data) await supabase.from("printers").update({ hours_total: Number(data.hours_total) + hours }).eq("id", printerId);
}

export async function finishJob(id: string) {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  const { data: job } = await supabase.from("print_jobs").select("*").eq("id", id).maybeSingle();
  if (!job || job.status !== "en cours") return fail("Cette impression n'est pas en cours.");
  const { error } = await supabase
    .from("print_jobs")
    .update({ status: "terminé", finished_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return fail("Impossible de terminer l'impression.");
  await addPrinterHours(supabase, job.printer_id, jobDurationMs(job) / 3_600_000);
  // Le filament utilisé est retiré du stock (bobine choisie, sinon la plus entamée du bon matériau).
  const used = Number(job.grams) * job.quantity;
  const spool = used > 0 ? await pickSpool(supabase, job.material, used, job.spool_id) : null;
  if (spool) {
    await moveFilament(supabase, spool, -used, "impression", job.id);
    if (!job.spool_id) await supabase.from("print_jobs").update({ spool_id: spool }).eq("id", id);
  }
  await logOrder(supabase, job.order_id, `Impression terminée : ${job.title}`);
  refresh(job.order_id);
  revalidatePath("/admin/stock");
  return ok(spool ? `Impression terminée, ${Math.round(used)} g retirés du stock` : "Impression terminée");
}

export async function failJob(id: string, reason: string, gramsLost: number) {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  const { data: job } = await supabase.from("print_jobs").select("*").eq("id", id).maybeSingle();
  if (!job || job.status !== "en cours") return fail("Cette impression n'est pas en cours.");
  const now = new Date();
  const elapsed = job.started_at ? (now.getTime() - new Date(job.started_at).getTime()) / 3_600_000 : 0;
  const { error } = await supabase
    .from("print_jobs")
    .update({
      status: "raté",
      finished_at: now.toISOString(),
      failure_reason: reason.trim().slice(0, 500) || "Non précisée",
      grams_lost: Number.isFinite(gramsLost) && gramsLost >= 0 ? gramsLost : null,
    })
    .eq("id", id);
  if (error) return fail("Impossible d'enregistrer le raté.");
  await addPrinterHours(supabase, job.printer_id, Math.min(elapsed, jobDurationMs(job) / 3_600_000));
  // Le filament perdu est retiré du stock lui aussi.
  const lost = Number.isFinite(gramsLost) && gramsLost > 0 ? gramsLost : 0;
  const lostSpool = lost ? await pickSpool(supabase, job.material, lost, job.spool_id) : null;
  if (lostSpool) await moveFilament(supabase, lostSpool, -lost, "raté", job.id);
  // On remet tout de suite la même impression en tête de la file de l'imprimante.
  await supabase.from("print_jobs").insert({
    order_id: job.order_id,
    printer_id: job.printer_id,
    title: job.title,
    material: job.material,
    grams: job.grams,
    hours: job.hours,
    quantity: job.quantity,
    spool_id: job.spool_id,
    position: -1,
  });
  await logOrder(supabase, job.order_id, `Impression ratée (${reason || "cause non précisée"}), relancée dans la file`);
  refresh(job.order_id);
  revalidatePath("/admin/stock");
  return ok("Raté enregistré, impression remise en tête de file");
}

export async function deleteJob(id: string) {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  const { data: job } = await supabase.from("print_jobs").select("order_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("print_jobs").delete().eq("id", id).neq("status", "en cours");
  if (error) return fail("Impossible de retirer l'impression.");
  refresh(job?.order_id);
  return ok();
}

// Bobine à utiliser pour une impression (vide = choix automatique à la fin de l'impression).
export async function setJobSpool(id: string, spoolId: string | null) {
  if (!(await isAdmin())) return fail("Accès refusé.");
  const supabase = await createClient();
  const { error } = await supabase.from("print_jobs").update({ spool_id: spoolId }).eq("id", id).in("status", ["à faire", "en cours"]);
  if (error) return fail("Impossible de choisir la bobine.");
  refresh();
  return ok();
}
