"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { sendStatusUpdate } from "@/lib/email";
import { formatPrice, orderStatuses } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export type OrderEditState = { status: "idle" | "success" | "error"; message?: string };

// « 12,50 » ou « 12.5 » → 1250 centimes. Vide → null.
function parseEuros(raw: string): number | null | undefined {
  const s = raw.replace(/\s|€/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 100000) return undefined;
  return Math.round(n * 100);
}

export async function updateOrder(id: string, _prev: OrderEditState, formData: FormData): Promise<OrderEditState> {
  if (!(await isAdmin())) return { status: "error", message: "Accès refusé." };

  const status = String(formData.get("status") ?? "");
  if (!(orderStatuses as readonly string[]).includes(status)) return { status: "error", message: "Statut inconnu." };
  const finalCents = parseEuros(String(formData.get("final_price") ?? ""));
  if (finalCents === undefined) return { status: "error", message: "Prix invalide. Exemple : 24,90" };
  const note = String(formData.get("admin_note") ?? "").trim().slice(0, 2000);

  const supabase = await createClient();
  const { data: before } = await supabase.from("orders").select("status").eq("id", id).maybeSingle();
  const { data, error } = await supabase
    .from("orders")
    .update({ status, final_cents: finalCents, admin_note: note || null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("customer_email, customer_name, user_id, estimated_cents")
    .maybeSingle();
  if (error) {
    console.error("Admin : mise à jour impossible", error.message);
    return { status: "error", message: "Impossible d'enregistrer. Réessayez." };
  }

  // Le client est prévenu par email quand le statut change.
  let mailed = false;
  if (data && before && before.status !== status) {
    const cents = finalCents ?? data.estimated_cents;
    mailed = await sendStatusUpdate({
      orderId: id,
      to: data.customer_email,
      name: data.customer_name,
      status,
      priceLabel: cents !== null ? formatPrice(cents) : null,
      hasAccount: Boolean(data.user_id),
    });
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/compte");
  return { status: "success", message: mailed ? "Enregistré, client prévenu" : "Enregistré" };
}
