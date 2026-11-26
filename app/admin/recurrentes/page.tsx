import PageHeader from "../PageHeader";
import RecurringView, { type Recurring } from "./RecurringView";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Commandes récurrentes" };

// Clients pros qui recommandent régulièrement la même chose (garage : 200 clips par mois…).
export default async function RecurringPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data }, { data: clients }] = await Promise.all([
    supabase.from("recurring_orders").select("*").order("next_on"),
    supabase.from("clients").select("email, name, company, is_pro").eq("is_pro", true).order("name"),
  ]);
  const list = (data ?? []) as Recurring[];
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
  const due = list.filter((r) => r.active && r.next_on <= today).length;
  return (
    <div>
      <PageHeader title="Commandes récurrentes" description={`${list.length} modèle(s)${due ? ` · ${due} à créer aujourd'hui` : ""}`} />
      <RecurringView list={list} today={today} pros={(clients ?? []) as { email: string; name: string | null; company: string | null }[]} />
    </div>
  );
}
