import type { Metadata } from "next";
import { Suspense } from "react";
import AdminSidebar, { type AdminCounts } from "./AdminSidebar";
import { requireAdmin } from "@/lib/admin";
import { getStock, isLow } from "@/lib/stock";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { default: "Gestionnaire", template: "%s · Gestionnaire Yris" },
  robots: { index: false },
};

const CLOSED = '("terminée","annulée")';

// Gestionnaire : page à part, sans l'en-tête ni le pied de page du site.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const user = await getUser();
  const supabase = await createClient();

  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  const orders = () => supabase.from("orders").select("id", { count: "exact", head: true });
  const reports = () => supabase.from("reports").select("id", { count: "exact", head: true });

  const [open, done, cancelled, all, reportsNew, reportsDone, stock] = await Promise.all([
    count(orders().not("status", "in", CLOSED)),
    count(orders().eq("status", "terminée")),
    count(orders().eq("status", "annulée")),
    count(orders()),
    count(reports().eq("status", "nouveau")),
    count(reports().eq("status", "traité")),
    getStock(),
  ]);
  const counts: AdminCounts = { open, done, cancelled, all, reportsNew, reportsDone, lowStock: stock.filter(isLow).length };

  return (
    <div className="flex min-h-screen flex-1">
      <Suspense>
        <AdminSidebar counts={counts} email={user?.email ?? ""} />
      </Suspense>
      <main className="theme-light min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1200px] px-5 pb-16 pt-20 sm:px-8 lg:pt-10">{children}</div>
      </main>
    </div>
  );
}
