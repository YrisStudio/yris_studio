"use server";

import { isAdmin } from "@/lib/admin";
import { clientKey } from "@/lib/clients";
import { createClient } from "@/lib/supabase/server";

export type SearchHit = {
  kind: "commande" | "client" | "bobine" | "consommable" | "imprimante" | "sav" | "tache";
  title: string;
  subtitle: string;
  href: string;
};

// Recherche globale du gestionnaire (palette Ctrl+K) : commandes, clients, stock, imprimantes, SAV, to-do.
export async function searchAdmin(raw: string): Promise<SearchHit[]> {
  // On retire les caractères qui ont un sens dans les filtres de la base (virgules, parenthèses, jokers).
  const q = raw.replace(/[,()%*\\"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (q.length < 2 || !(await isAdmin())) return [];
  const like = `%${q}%`;
  const ref = q.replace(/^#/, "").toLowerCase();
  const isRef = /^[0-9a-f]{4,36}$/.test(ref);
  const supabase = await createClient();

  const [orders, clients, spools, consumables, printers, reports, todos] = await Promise.all([
    supabase
      .from("orders")
      .select("id, customer_name, customer_email, customer_company, product_name, quote_number, invoice_number, status, created_at")
      .or(
        ["customer_name", "customer_email", "customer_company", "product_name", "quote_number", "invoice_number", "details", "city"]
          .map((c) => `${c}.ilike.${like}`)
          .join(","),
      )
      .or("payment.is.null,payment.eq.payée")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("clients").select("email, name, company").or(`email.ilike.${like},name.ilike.${like},company.ilike.${like}`).limit(5),
    supabase.from("filament_stock").select("id, material, color, brand, grams_left").or(`material.ilike.${like},color.ilike.${like},brand.ilike.${like}`).limit(5),
    supabase.from("consumables").select("id, name, quantity, unit").ilike("name", like).limit(4),
    supabase.from("printers").select("id, name, model, status").or(`name.ilike.${like},model.ilike.${like}`).limit(3),
    supabase.from("reports").select("id, name, email, category, status").or(`name.ilike.${like},email.ilike.${like},message.ilike.${like},order_ref.ilike.${like}`).limit(4),
    supabase.from("admin_todos").select("id, title, category, done").or(`title.ilike.${like},details.ilike.${like}`).limit(4),
  ]);

  // Référence de commande tapée (#a1b2c3d4) : l'identifiant ne se filtre pas en texte, on le cherche à part.
  let byRef: typeof orders.data = [];
  if (isRef) {
    const { data } = await supabase
      .from("orders")
      .select("id, customer_name, customer_email, customer_company, product_name, quote_number, invoice_number, status, created_at")
      .or("payment.is.null,payment.eq.payée")
      .order("created_at", { ascending: false })
      .limit(500);
    byRef = (data ?? []).filter((o) => o.id.startsWith(ref)).slice(0, 3);
  }

  const hits: SearchHit[] = [];
  const seenOrders = new Set<string>();
  for (const o of [...(byRef ?? []), ...(orders.data ?? [])]) {
    if (seenOrders.has(o.id)) continue;
    seenOrders.add(o.id);
    hits.push({
      kind: "commande",
      title: `${o.product_name || "Demande sur mesure"} · ${o.customer_name || o.customer_email || "client"}`,
      subtitle: [`#${o.id.slice(0, 8).toUpperCase()}`, o.quote_number, o.status].filter(Boolean).join(" · "),
      href: `/admin/commandes/${o.id}`,
    });
  }

  // Clients : fiches enregistrées + emails trouvés dans les commandes.
  const seenClients = new Set<string>();
  for (const c of clients.data ?? []) {
    const email = String(c.email).toLowerCase();
    seenClients.add(email);
    hits.push({ kind: "client", title: c.name || email, subtitle: [c.company, email].filter(Boolean).join(" · "), href: `/admin/clients/${clientKey(email)}` });
  }
  for (const o of orders.data ?? []) {
    const email = o.customer_email?.toLowerCase();
    if (!email || seenClients.has(email) || seenClients.size >= 6) continue;
    const match = `${o.customer_name ?? ""} ${email} ${o.customer_company ?? ""}`.toLowerCase().includes(q.toLowerCase());
    if (!match) continue;
    seenClients.add(email);
    hits.push({ kind: "client", title: o.customer_name || email, subtitle: [o.customer_company, email].filter(Boolean).join(" · "), href: `/admin/clients/${clientKey(email)}` });
  }

  for (const s of spools.data ?? [])
    hits.push({ kind: "bobine", title: `${s.material} ${s.color}`, subtitle: [s.brand, `${Math.round(Number(s.grams_left))} g restants`].filter(Boolean).join(" · "), href: "/admin/stock" });
  for (const c of consumables.data ?? [])
    hits.push({ kind: "consommable", title: c.name, subtitle: `${c.quantity} ${c.unit}`, href: "/admin/stock?tab=consommables" });
  for (const p of printers.data ?? []) hits.push({ kind: "imprimante", title: p.name, subtitle: `${p.model} · ${p.status}`, href: "/admin/atelier" });
  for (const r of reports.data ?? []) hits.push({ kind: "sav", title: `${r.category} · ${r.name}`, subtitle: `${r.email} · ${r.status}`, href: "/admin/sav" });
  for (const t of todos.data ?? []) hits.push({ kind: "tache", title: t.title, subtitle: `${t.category}${t.done ? " · faite" : ""}`, href: "/admin/todo" });

  return hits;
}
