import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import AddSpoolForm from "./AddSpoolForm";
import { deleteSpool, refillSpool, consumeFilament } from "./actions";
import PageHeader from "../PageHeader";
import { requireAdmin } from "@/lib/admin";
import { getStock, isLow } from "@/lib/stock";

export const metadata = { title: "Stock de filament" };

const kg = (g: number) => (g >= 1000 ? `${(g / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} kg` : `${g} g`);

export default async function AdminStock() {
  await requireAdmin();
  const stock = await getStock();
  const low = stock.filter(isLow);
  const total = stock.reduce((n, s) => n + s.grams_left, 0);

  // Total restant par matériau.
  const byMaterial = new Map<string, number>();
  for (const s of stock) byMaterial.set(s.material, (byMaterial.get(s.material) ?? 0) + s.grams_left);

  return (
    <div>
      <PageHeader
        title="Stock de filament"
        description={`${stock.length} bobine(s), ${kg(total)} au total. Retirez le poids utilisé après chaque impression.`}
      />

      {low.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <p>
            <span className="font-medium">À racheter :</span>{" "}
            {low.map((s) => `${s.material} ${s.color} (${s.grams_left} g)`).join(", ")}.
          </p>
        </div>
      )}

      {byMaterial.size > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {[...byMaterial].map(([m, g]) => (
            <span key={m} className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm">
              <span className="font-medium">{m}</span> <span className="font-mono text-muted">{kg(g)}</span>
            </span>
          ))}
        </div>
      )}

      <AddSpoolForm />

      {stock.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line-strong p-12 text-center text-sm text-muted">
          Aucune bobine enregistrée. Ajoutez votre première bobine ci-dessus.
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stock.map((s) => {
            const pct = Math.round((s.grams_left / s.spool_grams) * 100);
            const lowNow = isLow(s);
            return (
              <li key={s.id} className={`rounded-2xl border bg-panel p-5 ${lowNow ? "border-accent/50" : "border-line"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="size-9 shrink-0 rounded-full border border-line-strong" style={{ background: s.color_hex }} />
                    <div>
                      <p className="font-medium">
                        {s.material} <span className="text-muted">·</span> {s.color}
                      </p>
                      <p className="font-mono text-[11px] text-muted">
                        {kg(s.grams_left)} / {kg(s.spool_grams)}
                      </p>
                    </div>
                  </div>
                  {lowNow && (
                    <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                      Stock bas
                    </span>
                  )}
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-fg/10">
                  <div
                    className={`h-full rounded-full ${lowNow ? "bg-accent" : "bg-emerald-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <form action={consumeFilament.bind(null, s.id)} className="mt-4 flex gap-2">
                  <label htmlFor={`used-${s.id}`} className="sr-only">Grammes utilisés</label>
                  <input
                    id={`used-${s.id}`}
                    name="used"
                    type="number"
                    placeholder="Grammes utilisés"
                    className="min-w-0 flex-1 rounded-lg border border-line-strong bg-panel-2 px-3 py-1.5 text-sm outline-none focus:border-accent"
                  />
                  <button type="submit" className="rounded-lg bg-fg px-3 py-1.5 text-sm text-bg hover:opacity-85">
                    Retirer
                  </button>
                </form>

                <div className="mt-3 flex items-center justify-between">
                  <form action={refillSpool.bind(null, s.id)}>
                    <button type="submit" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg">
                      <RefreshCw size={12} aria-hidden />
                      Nouvelle bobine
                    </button>
                  </form>
                  <form action={deleteSpool.bind(null, s.id)}>
                    <button type="submit" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-red-600">
                      <Trash2 size={12} aria-hidden />
                      Supprimer
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
