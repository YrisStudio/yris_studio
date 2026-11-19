import PageHeader from "../PageHeader";
import StockView from "./StockView";
import { requireAdmin } from "@/lib/admin";
import { getTariffs } from "@/lib/settings";
import { isLow } from "@/lib/stock";
import { getConsumables, getMovements, getStock } from "@/lib/stock-server";

export const metadata = { title: "Stock" };

export default async function AdminStock() {
  await requireAdmin();
  const [spools, movements, consumables, tariffs] = await Promise.all([getStock(), getMovements(), getConsumables(), getTariffs()]);
  const kg = spools.reduce((n, s) => n + Number(s.grams_left), 0) / 1000;
  const low = spools.filter(isLow).length + consumables.filter((c) => Number(c.quantity) <= Number(c.alert_quantity)).length;

  return (
    <div>
      <PageHeader
        title="Stock"
        description={`${spools.length} bobine(s) · ${kg.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kg de filament${low ? ` · ${low} à racheter` : ""}`}
      />
      <StockView spools={spools} movements={movements} consumables={consumables} tariffs={tariffs} nowIso={new Date().toISOString()} />
    </div>
  );
}
