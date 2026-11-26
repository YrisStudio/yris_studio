import PageHeader from "../PageHeader";
import NewsletterView from "./NewsletterView";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Newsletter" };

export default async function NewsletterPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("newsletter_subscribers").select("email, source, created_at, unsubscribed_at").order("created_at", { ascending: false });
  const all = (data ?? []) as { email: string; source: string | null; created_at: string; unsubscribed_at: string | null }[];
  const active = all.filter((s) => !s.unsubscribed_at);
  return (
    <div>
      <PageHeader title="Newsletter" description={`${active.length} inscrit(s) · ${all.length - active.length} désinscrit(s)`} />
      <NewsletterView subscribers={active.map((s) => ({ email: s.email, since: s.created_at }))} />
    </div>
  );
}
