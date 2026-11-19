import Link from "next/link";
import PageHeader from "../PageHeader";
import ReportCard from "./ReportCard";
import { requireAdmin } from "@/lib/admin";
import type { PrintJob } from "@/lib/atelier";
import { getAllOrders } from "@/lib/orders";
import { refPrefix, reportStatuses, reportStatusMeta, type Report, type ReportStatus } from "@/lib/reports";
import { getTariffs } from "@/lib/settings";
import { formatPrice } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "SAV" };

export default async function AdminSav({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  await requireAdmin();
  const { vue } = await searchParams;
  const view: ReportStatus = (reportStatuses as readonly string[]).includes(vue ?? "") ? (vue as ReportStatus) : "nouveau";

  const supabase = await createClient();
  const [reportsRes, jobsRes, orders, tariffs] = await Promise.all([
    supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("print_jobs").select("*").not("report_id", "is", null),
    getAllOrders(),
    getTariffs(),
  ]);
  if (reportsRes.error) console.error("SAV :", reportsRes.error.message);
  const reports = (reportsRes.data ?? []) as Report[];
  const reprints = (jobsRes.data ?? []) as PrintJob[];

  // Coût des réimpressions (filament au prix des Tarifs) : ce que coûte le SAV.
  const cost = reprints.reduce(
    (n, j) => n + Math.round(((Number(j.grams) * j.quantity) / 1000) * (tariffs.materials[(j.material ?? "PLA") as keyof typeof tariffs.materials] ?? tariffs.materials.PLA)),
    0,
  );
  const counts = Object.fromEntries(reportStatuses.map((s) => [s, reports.filter((r) => r.status === s).length])) as Record<ReportStatus, number>;
  const list = reports.filter((r) => r.status === view);

  return (
    <div>
      <PageHeader
        title="SAV"
        description={`${counts.nouveau} à traiter · ${counts["en cours"]} en cours · ${reprints.length} réimpression(s), ${formatPrice(cost)} de filament`}
      />

      <div className="mb-4 flex rounded-md border border-line bg-panel p-0.5 text-[12.5px] sm:inline-flex" role="tablist">
        {reportStatuses.map((s) => (
          <Link
            key={s}
            href={`/admin/sav?vue=${encodeURIComponent(s)}`}
            role="tab"
            aria-selected={view === s}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1 transition sm:flex-none ${view === s ? "bg-fg/10 text-fg" : "text-muted hover:text-fg"}`}
          >
            <span className={`size-1.5 rounded-full ${reportStatusMeta[s].dot}`} aria-hidden />
            {reportStatusMeta[s].label}
            <span className="font-mono text-[10.5px] opacity-70">{counts[s]}</span>
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-10 text-center text-[13px] text-muted">
          {view === "nouveau" ? "Aucun signalement à traiter. 🎉" : "Rien ici."}
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => {
            const prefix = refPrefix(r.order_ref);
            const order = prefix ? orders.find((o) => o.id.startsWith(prefix)) ?? null : null;
            return (
              <ReportCard
                key={r.id}
                report={r}
                order={order ? { id: order.id, title: order.product_name ?? order.details?.split("\n")[0] ?? "Commande", hasQuote: Boolean(order.quote_inputs?.hours) } : null}
                reprints={reprints.filter((j) => j.report_id === r.id)}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
