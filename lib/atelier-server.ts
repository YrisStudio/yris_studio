import type { PrintJob, Printer } from "@/lib/atelier";
import { createClient } from "@/lib/supabase/server";

export async function getPrinters() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("printers").select("*").order("created_at");
  if (error) console.error("Imprimantes :", error.message);
  return (data ?? []) as Printer[];
}

// File d'attente + impressions en cours, et les 50 dernières terminées ou ratées.
export async function getPrintJobs() {
  const supabase = await createClient();
  const [active, history] = await Promise.all([
    supabase.from("print_jobs").select("*").in("status", ["à faire", "en cours"]).order("position").order("created_at"),
    supabase
      .from("print_jobs")
      .select("*")
      .in("status", ["terminé", "raté"])
      .order("finished_at", { ascending: false })
      .limit(50),
  ]);
  if (active.error) console.error("File d'impression :", active.error.message);
  return {
    active: (active.data ?? []) as PrintJob[],
    history: (history.data ?? []) as PrintJob[],
  };
}

export async function getOrderJobs(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("print_jobs").select("*").eq("order_id", orderId).order("created_at");
  return (data ?? []) as PrintJob[];
}
