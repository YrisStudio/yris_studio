import PageHeader from "../PageHeader";
import PromosView, { type Promo } from "./PromosView";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Codes promo" };

export default async function PromosPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
  const promos = (data ?? []) as Promo[];
  const shop = promos.filter((p) => !p.owner_email && !p.reward_for);
  const referral = promos.filter((p) => p.owner_email || p.reward_for);
  return (
    <div>
      <PageHeader title="Codes promo" description="Réductions sur la boutique, et codes de parrainage des clients." />
      <PromosView shop={shop} referral={referral} />
    </div>
  );
}
