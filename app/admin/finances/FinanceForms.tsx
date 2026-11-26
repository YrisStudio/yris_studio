"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Camera, FileText, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { addExpense, deleteExpense, saveFinanceSettings, type FinanceState } from "./actions";
import { expenseCategories, type Expense, type FinanceSettings } from "@/lib/finance";
import { formatPrice } from "@/lib/site";
import { shrinkImage } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

const field = "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";
const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());

// Nouvelle dépense, avec la photo du ticket prise au téléphone (ou un PDF de facture).
export function ExpenseForm({ orders }: { orders: { id: string; label: string }[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const [receipt, setReceipt] = useState<{ path: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, action, pending] = useActionState<FinanceState, FormData>(async (prev, fd) => {
    const res = await addExpense(prev, fd);
    if (res.status === "success") {
      ref.current?.reset();
      setReceipt(null);
    }
    return res;
  }, { status: "idle" });

  async function upload(file: File | undefined) {
    if (!file) return;
    const supabase = createClient();
    if (!supabase) return;
    setError(null);
    setUploading(true);
    const body = file.type.startsWith("image/") ? await shrinkImage(file, 2000) : file;
    const safe = body.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").slice(-80);
    const path = `${crypto.randomUUID()}/${safe}`;
    const { error: e } = await supabase.storage.from("tickets").upload(path, body, { contentType: body.type });
    setUploading(false);
    if (e) return setError("Ticket non envoyé : " + e.message);
    setReceipt({ path, name: file.name });
  }

  return (
    <form ref={ref} action={action} className="grid grid-cols-2 gap-2 sm:grid-cols-[130px_1fr_140px_110px]">
      <input type="hidden" name="receipt_path" value={receipt?.path ?? ""} />
      <input name="spent_on" type="date" defaultValue={today()} required aria-label="Date" className={field} />
      <input name="label" required maxLength={200} placeholder="Bobine PETG noir 1 kg" aria-label="Achat" className={field} />
      <select name="category" defaultValue="Filament" aria-label="Catégorie" className={field}>
        {expenseCategories.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <input name="amount" required inputMode="decimal" placeholder="24,90 €" aria-label="Montant TTC" className={`${field} font-mono`} />
      <input name="supplier" maxLength={120} placeholder="Fournisseur (facultatif)" aria-label="Fournisseur" className={field} />
      <select name="order_id" defaultValue="" aria-label="Commande liée" className={`${field} sm:col-span-2`}>
        <option value="">Pas liée à une commande</option>
        {orders.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[12.5px] text-muted hover:text-fg">
        {uploading ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Camera size={13} aria-hidden />}
        {receipt ? "Ticket ✓" : "Ticket"}
        <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      </label>
      <button type="submit" disabled={pending || uploading} className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-md bg-fg px-3 py-1.5 text-[12.5px] font-medium text-bg disabled:opacity-60 sm:col-span-4">
        {pending ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Plus size={13} aria-hidden />} Ajouter la dépense
      </button>
      {(error || state.message) && (
        <p className={`col-span-2 text-[12px] sm:col-span-4 ${error || state.status === "error" ? "text-red-300" : "text-accent"}`}>{error ?? state.message}</p>
      )}
    </form>
  );
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "2-digit" });

export function ExpenseList({ expenses, receiptUrls }: { expenses: Expense[]; receiptUrls: Record<string, string> }) {
  const [, start] = useTransition();
  if (!expenses.length) return <p className="mt-4 text-[13px] text-muted">Aucune dépense enregistrée.</p>;
  return (
    <ul className="mt-4 divide-y divide-line rounded-md border border-line">
      {expenses.map((e) => (
        <li key={e.id} className="group flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2 text-[13px]">
          <span className="w-16 shrink-0 font-mono text-[11.5px] text-muted">{dateFmt.format(new Date(`${e.spent_on}T12:00:00`))}</span>
          <span className="min-w-0 flex-1 truncate">
            {e.label}
            <span className="text-muted">
              {" "}
              · {e.category}
              {e.supplier && ` · ${e.supplier}`}
            </span>
          </span>
          {e.receipt_path && receiptUrls[e.receipt_path] && (
            <a href={receiptUrls[e.receipt_path]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-fg">
              <FileText size={12} aria-hidden /> Ticket
            </a>
          )}
          <span className="font-mono">{formatPrice(e.amount_cents)}</span>
          <button
            type="button"
            onClick={() => confirm(`Supprimer la dépense « ${e.label} » ?`) && start(() => deleteExpense(e.id))}
            aria-label={`Supprimer ${e.label}`}
            className="text-muted opacity-60 hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Trash2 size={13} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function FinanceSettingsForm({ settings }: { settings: FinanceSettings }) {
  const [state, action, pending] = useActionState<FinanceState, FormData>(saveFinanceSettings, { status: "idle" });
  return (
    <details className="mt-3 text-[12.5px]">
      <summary className="cursor-pointer text-muted hover:text-fg">Réglages de déclaration</summary>
      <form action={action} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_110px_110px_auto]">
        <select name="urssafPeriod" defaultValue={settings.urssafPeriod} aria-label="Fréquence" className={field}>
          <option value="trimestrielle">Déclaration trimestrielle</option>
          <option value="mensuelle">Déclaration mensuelle</option>
        </select>
        <label className="flex items-center gap-1">
          <input name="urssafRatePct" defaultValue={String(settings.urssafRatePct).replace(".", ",")} inputMode="decimal" aria-label="Taux de cotisations" className={`${field} font-mono`} />
          <span className="text-muted">%</span>
        </label>
        <label className="flex items-center gap-1" title="Versement libératoire de l'impôt sur le revenu (1 % pour la vente), 0 si non choisi">
          <input name="liberatoirePct" defaultValue={String(settings.liberatoirePct).replace(".", ",")} inputMode="decimal" aria-label="Versement libératoire" className={`${field} font-mono`} />
          <span className="text-muted">%</span>
        </label>
        <button type="submit" disabled={pending} className="rounded-md border border-line px-2.5 py-1.5 hover:text-fg disabled:opacity-60">
          Enregistrer
        </button>
        <p className="col-span-2 text-[11.5px] text-muted sm:col-span-4">
          Taux pour la vente de marchandises : 12,3 % de cotisations (vérifiez le vôtre sur votre espace URSSAF) ; versement libératoire 1 % si vous l&apos;avez choisi.
          {state.message && <span className={state.status === "error" ? " text-red-300" : " text-accent"}> {state.message}</span>}
        </p>
      </form>
    </details>
  );
}
