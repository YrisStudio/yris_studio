import { isAdmin } from "@/lib/admin";
import { sales, type Expense } from "@/lib/finance";
import { getAllOrders } from "@/lib/orders";
import { orderRef } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

// Export comptable (CSV pour Excel ou le comptable) : livre des recettes et registre des achats,
// les deux documents obligatoires d'une micro-entreprise qui vend des marchandises.
export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("Accès refusé", { status: 403 });
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("annee")) || new Date().getFullYear();
  const type = url.searchParams.get("type") === "achats" ? "achats" : "recettes";
  const inYear = (d: Date) => d.getUTCFullYear() === year;
  const euros = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const cell = (v: string | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const day = (d: Date) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris" }).format(d);

  let rows: string[][];
  if (type === "recettes") {
    const list = sales(await getAllOrders()).filter((s) => inYear(s.date)).reverse();
    rows = [
      ["Date d'encaissement", "N° de facture", "Commande", "Client", "Nature de la vente", "Montant (€)", "Mode de règlement"],
      ...list.map((s) => [
        day(s.date),
        s.order.invoice_number ?? "",
        orderRef(s.order.id),
        s.order.customer_company || s.order.customer_name || s.order.customer_email || "",
        s.order.product_name ?? "Pièce sur mesure",
        euros(s.amount),
        s.order.payment === "payée" ? "Carte bancaire (Stripe)" : "À préciser",
      ]),
    ];
  } else {
    const supabase = await createClient();
    const { data } = await supabase.from("expenses").select("*").gte("spent_on", `${year}-01-01`).lte("spent_on", `${year}-12-31`).order("spent_on");
    rows = [
      ["Date", "Achat", "Catégorie", "Fournisseur", "Montant (€)", "Ticket"],
      ...((data ?? []) as Expense[]).map((e) => [
        day(new Date(`${e.spent_on}T12:00:00`)),
        e.label,
        e.category,
        e.supplier ?? "",
        euros(e.amount_cents),
        e.receipt_path ? "oui" : "non",
      ]),
    ];
  }

  // Point-virgule et BOM UTF-8 : s'ouvre directement et correctement dans Excel en français.
  const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="yris-${type}-${year}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
