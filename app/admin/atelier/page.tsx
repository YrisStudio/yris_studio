import PageHeader from "../PageHeader";
import AtelierView from "./AtelierView";
import { requireAdmin } from "@/lib/admin";
import { getPrintJobs, getPrinters } from "@/lib/atelier-server";
import { getTariffs } from "@/lib/settings";

export const metadata = { title: "Atelier" };

export default async function AdminAtelier() {
  await requireAdmin();
  const [printers, jobs, tariffs] = await Promise.all([getPrinters(), getPrintJobs(), getTariffs()]);
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
        nowIso={new Date().toISOString()}
      />
    </div>
  );
}
