"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, ExternalLink, FileText, ImagePlus, LoaderCircle, Printer, RotateCcw, Tag, Truck, X } from "lucide-react";
import { issueInvoice, refundOrder, removeOrderPhoto, shipOrder, uploadOrderPhoto, type ExtraState } from "../extra-actions";
import { carriers, carrierTrackingUrl } from "@/lib/shipping";
import { formatPrice } from "@/lib/site";
import { shrinkImage } from "@/lib/storage";

const field = "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";
const btn = "inline-flex items-center justify-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[12.5px] transition hover:border-line-strong hover:text-fg disabled:opacity-60";

function Msg({ state }: { state: ExtraState }) {
  if (!state.message) return null;
  return <p className={`text-[12px] ${state.status === "error" ? "text-red-300" : "text-accent"}`}>{state.message}</p>;
}

// Photos de la pièce finie : prises au téléphone (appareil photo direct) ou choisies dans la galerie.
export function FinishedPhotos({ id, photos }: { id: string; photos: { path: string; url: string }[] }) {
  const router = useRouter();
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function upload(list: FileList | null) {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setError(null);
    start(async () => {
      for (const [i, f] of files.entries()) {
        setProgress(`Envoi ${i + 1}/${files.length}…`);
        const fd = new FormData();
        fd.append("photo", await shrinkImage(f));
        const res = await uploadOrderPhoto(id, fd);
        if (res.status === "error") {
          setError(res.message ?? "Envoi impossible.");
          break;
        }
      }
      setProgress(null);
      if (gallery.current) gallery.current.value = "";
      if (camera.current) camera.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="space-y-2.5">
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <li key={p.path} className="group relative overflow-hidden rounded-md border border-line bg-bg">
              <a href={p.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- photo Supabase Storage */}
                <img src={p.url} alt="Pièce finie" className="aspect-square w-full object-cover" />
              </a>
              <button
                type="button"
                disabled={pending}
                onClick={() => confirm("Retirer cette photo ?") && start(async () => { await removeOrderPhoto(id, p.path); router.refresh(); })}
                aria-label="Retirer la photo"
                className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-80 hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <X size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending} onClick={() => camera.current?.click()} className={btn}>
          <Camera size={13} aria-hidden /> Prendre une photo
        </button>
        <button type="button" disabled={pending} onClick={() => gallery.current?.click()} className={btn}>
          <ImagePlus size={13} aria-hidden /> Galerie
        </button>
        {progress && (
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <LoaderCircle size={12} className="animate-spin" aria-hidden /> {progress}
          </span>
        )}
        <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => upload(e.target.files)} />
        <input ref={gallery} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
      </div>
      {error && <p className="text-[12px] text-red-300">{error}</p>}
      <p className="text-[11.5px] text-muted">Envoyées au client avec l&apos;email « Votre commande est prête », et réutilisables pour les réseaux.</p>
    </div>
  );
}

// Facture : numéro définitif + PDF à imprimer.
export function InvoiceBox({ id, number, date, canIssue }: { id: string; number: string | null; date: string | null; canIssue: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ExtraState>({ status: "idle" });
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]">
      <FileText size={14} className="text-muted" aria-hidden />
      {number ? (
        <>
          <span className="font-mono">{number}</span>
          {date && <span className="text-muted">du {new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR")}</span>}
          <Link href={`/imprimer/facture/${id}`} target="_blank" className={`${btn} ml-auto`}>
            <Printer size={13} aria-hidden /> Facture PDF
          </Link>
        </>
      ) : (
        <>
          <span className="text-muted">Pas encore de facture.</span>
          <button
            type="button"
            disabled={pending || !canIssue}
            title={canIssue ? undefined : "Il faut d'abord un prix (devis ou prix final)."}
            onClick={() =>
              confirm("Émettre la facture ? Son numéro est définitif.") &&
              start(async () => {
                setMsg(await issueInvoice(id));
                router.refresh();
              })
            }
            className={`${btn} ml-auto`}
          >
            {pending ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <FileText size={13} aria-hidden />} Émettre la facture
          </button>
        </>
      )}
      <div className="w-full">
        <Msg state={msg} />
      </div>
    </div>
  );
}

// Expédition : transporteur + numéro de suivi, puis étiquette à imprimer.
export function ShippingBox({ id, carrier, tracking, shippedAt }: { id: string; carrier: string | null; tracking: string | null; shippedAt: string | null }) {
  const [state, action, pending] = useActionState<ExtraState, FormData>(shipOrder.bind(null, id), { status: "idle" });
  const [edit, setEdit] = useState(!tracking);
  const url = carrier && tracking ? carrierTrackingUrl(carrier, tracking) : null;
  return (
    <div className="space-y-2.5">
      {tracking && !edit ? (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <Truck size={14} className="text-muted" aria-hidden />
          <span>{carrier}</span>
          <span className="font-mono">{tracking}</span>
          {shippedAt && <span className="text-muted">· parti le {new Date(shippedAt).toLocaleDateString("fr-FR")}</span>}
          {url && (
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
              Suivre <ExternalLink size={11} aria-hidden />
            </a>
          )}
          <button type="button" onClick={() => setEdit(true)} className="ml-auto text-[12px] text-muted hover:text-fg">
            Modifier
          </button>
        </div>
      ) : (
        <form action={action} className="grid grid-cols-2 gap-2 sm:grid-cols-[150px_1fr_auto]">
          <select name="carrier" defaultValue={carrier ?? "Colissimo"} aria-label="Transporteur" className={field}>
            {carriers.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input name="tracking" defaultValue={tracking ?? ""} required placeholder="Numéro de suivi" aria-label="Numéro de suivi" className={`${field} font-mono`} />
          <button type="submit" disabled={pending} className={`${btn} col-span-2 bg-fg text-bg hover:text-bg sm:col-span-1`}>
            {pending ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Truck size={13} aria-hidden />} Expédié
          </button>
        </form>
      )}
      <Msg state={state} />
      <Link href={`/imprimer/etiquette/${id}`} target="_blank" className={btn}>
        <Tag size={13} aria-hidden /> Étiquette d&apos;expédition
      </Link>
    </div>
  );
}

// Remboursement Stripe, total ou partiel.
export function RefundBox({ id, paidCents, refundedCents }: { id: string; paidCents: number; refundedCents: number }) {
  const [state, action, pending] = useActionState<ExtraState, FormData>(refundOrder.bind(null, id), { status: "idle" });
  const left = paidCents - refundedCents;
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2 text-[13px]">
      <p>
        Payé par carte : <span className="font-mono">{formatPrice(paidCents)}</span>
        {refundedCents > 0 && (
          <span className="text-amber-300">
            {" "}
            · remboursé <span className="font-mono">{formatPrice(refundedCents)}</span>
          </span>
        )}
      </p>
      {left > 0 &&
        (open ? (
          <form
            action={(fd) => {
              if (confirm("Rembourser le client ? L'argent repart sur sa carte.")) action(fd);
            }}
            className="grid grid-cols-2 gap-2 sm:grid-cols-[120px_1fr_auto]"
          >
            <input name="amount" inputMode="decimal" placeholder={formatPrice(left)} aria-label="Montant (vide = tout)" className={`${field} font-mono`} />
            <input name="reason" placeholder="Raison (facultatif)" aria-label="Raison" className={field} />
            <button type="submit" disabled={pending} className={`${btn} col-span-2 text-red-300 sm:col-span-1`}>
              {pending ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <RotateCcw size={13} aria-hidden />} Rembourser
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className={btn}>
            <RotateCcw size={13} aria-hidden /> Rembourser…
          </button>
        ))}
      <Msg state={state} />
    </div>
  );
}
