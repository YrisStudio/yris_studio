import PageHeader from "../PageHeader";
import AtelierView from "./AtelierView";
import { requireAdmin } from "@/lib/admin";
import { getPrintJobs, getPrinters } from "@/lib/atelier-server";
import { getTariffs } from "@/lib/settings";
import { getStock } from "@/lib/stock-server";

export const metadata = { title: "Atelier" };

export default async function AdminAtelier() {
  await requireAdmin();
  const [printers, jobs, tariffs, spools] = await Promise.all([getPrinters(), getPrintJobs(), getTariffs(), getStock()]);
  const queued = jobs.active.filter((j) => j.status === "à faire").length;
  const running = jobs.active.filter((j) => j.status === "en cours").length;

  return (
    <div>
      <PageHeader
        title="Atelier"
        description={`${printers.length} imprimante(s) · ${running} en cours · ${queued} dans la file`}
      />
      <AtelierView
        printers={printers}
        jobs={jobs.active}
        history={jobs.history}
        materialPrices={tariffs.materials}
        spools={spools}
        nowIso={new Date().toISOString()}
      />
    </div>
  );
}
