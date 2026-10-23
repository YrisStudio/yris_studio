import { Box, Car, Clock, FileBox, House, Layers, LampDesk, Package, Euro, Wrench, type LucideIcon } from "lucide-react";
import { Mono } from "@/components/ui";
import { materials, type Category } from "@/lib/site";

// Résistance à la chaleur, en °C, pour les barres du comparatif.
const heatValues: Record<string, number> = { PLA: 55, PETG: 75, ABS: 95, ASA: 95 };

function Stat({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: string; note?: string }) {
  return (
    <div className="flex items-start gap-3 border-line p-4 [&:not(:first-child)]:border-l">
      <span className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-panel-2">
        <Icon size={15} className="text-accent-2" aria-hidden />
      </span>
      <div className="min-w-0">
        <Mono>{label}</Mono>
        <p className="mt-0.5 font-mono text-[15px] text-fg">{value}</p>
        {note && <p className="mt-0.5 font-mono text-[10px] text-emerald-400/80">{note}</p>}
      </div>
    </div>
  );
}

// Faux tableau de bord du hero : un exemple de devis tel que le client le reçoit.
export function QuoteDashboard() {
  const tabs = ["Devis", "Commandes", "Fichiers", "Matériaux"];
  // Courbe de progression de l'impression (couches par quart d'heure).
  const pts = [0, 6, 14, 20, 31, 38, 52, 60, 71, 80, 88, 100];
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i / (pts.length - 1)) * 300},${100 - v * 0.9}`).join(" ");

  return (
    <div
      className="mx-auto w-full max-w-[1000px] overflow-hidden rounded-2xl border border-line-strong bg-panel text-left shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)]"
      aria-hidden
      data-reveal
    >
      <div className="flex items-center gap-6 border-b border-line px-5 py-3">
        <span className="font-mono text-[11px] tracking-[0.3em] text-muted">YRIS</span>
        <div className="hidden gap-1 sm:flex">
          {tabs.map((t, i) => (
            <span
              key={t}
              className={`rounded-md px-3 py-1.5 font-mono text-[11px] ${i === 0 ? "bg-panel-2 text-fg" : "text-muted"}`}
            >
              {t}
            </span>
          ))}
        </div>
        <span className="ml-auto flex items-center gap-2 rounded-md border border-line bg-panel-2 px-2.5 py-1 font-mono text-[11px] text-fg/80">
          <FileBox size={13} className="text-accent-2" />
          clip_porte_208.stl
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-4 pt-5">
        <div>
          <p className="font-mono text-[15px] text-fg">Devis #0142.</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted">Clip de garnissage · Peugeot 208</p>
        </div>
        <span className="rounded-md border border-line bg-panel-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
          Exemple
        </span>
      </div>

      <div className="mx-5 grid grid-cols-2 overflow-hidden rounded-xl border border-line sm:grid-cols-5">
        <Stat icon={Layers} label="Matériau" value="ASA" note="anti-UV" />
        <Stat icon={Package} label="Quantité" value="10" />
        <Stat icon={Clock} label="Impression" value="3 h 20" />
        <Stat icon={Box} label="Matière" value="46 g" />
        <Stat icon={Euro} label="Prix total" value="38 €" note="devis gratuit" />
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2">
        <div className="rounded-xl border border-line p-4">
          <p className="font-mono text-[13px] text-fg">Progression de l&apos;impression</p>
          <p className="font-mono text-[10px] text-muted">Couches imprimées, en %</p>
          <svg viewBox="0 0 300 100" className="mt-4 h-32 w-full overflow-visible">
            {[0, 25, 50, 75, 100].map((y) => (
              <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="currentColor" strokeOpacity="0.07" />
            ))}
            <path d={`${path} L300,100 L0,100 Z`} fill="url(#fill)" />
            <path d={path} fill="none" stroke="#f2542d" strokeWidth="2" className="draw-path" />
            <defs>
              <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#f2542d" stopOpacity="0.35" />
                <stop offset="1" stopColor="#f2542d" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="191" x2="191" y1="0" y2="100" stroke="rgb(255 255 255 / 0.3)" strokeDasharray="3 3" />
            <circle cx="191" cy={100 - 60 * 0.9} r="4" fill="#0a0a0b" stroke="#ff8a4c" strokeWidth="2" />
          </svg>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
            <span>0 h</span>
            <span>1 h</span>
            <span>2 h</span>
            <span>3 h 20</span>
          </div>
        </div>

        <div className="rounded-xl border border-line p-4">
          <p className="font-mono text-[13px] text-fg">Résistance à la chaleur</p>
          <p className="font-mono text-[10px] text-muted">Par matériau, en °C</p>
          <div className="mt-5 space-y-3.5">
            {materials.map((m, i) => (
              <div key={m.name} className="grid grid-cols-[48px_1fr_48px] items-center gap-3 font-mono text-[11px]">
                <span className={m.name === "ASA" ? "text-fg" : "text-muted"}>{m.name}</span>
                <span className="h-3 overflow-hidden rounded-sm bg-fg/5">
                  <span
                    className="grow-x block h-full rounded-sm bg-gradient-to-r from-accent to-accent-2"
                    style={{ width: `${heatValues[m.name]}%`, opacity: m.name === "ASA" ? 1 : 0.45, ["--d2" as string]: `${i * 120}ms` }}
                  />
                </span>
                <span className="text-right text-fg/80">{heatValues[m.name]} °C</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mini-interfaces des trois étapes.
export function StepUpload() {
  return (
    <div className="space-y-2.5" aria-hidden>
      {[
        { name: "clip_porte_208.stl", size: "2,4 Mo", on: true },
        { name: "photo_piece.jpg", size: "1,1 Mo", on: false },
      ].map((f) => (
        <div key={f.name} className="flex items-center gap-3 rounded-lg border border-line bg-panel-2 px-3 py-2.5">
          <FileBox size={14} className="text-accent-2" />
          <span className="flex-1 truncate font-mono text-[11px] text-fg/90">{f.name}</span>
          <span className="font-mono text-[10px] text-muted">{f.size}</span>
          <span className={`flex h-4 w-7 items-center rounded-full px-0.5 ${f.on ? "justify-end bg-emerald-500" : "bg-fg/15"}`}>
            <span className="size-3 rounded-full bg-white" />
          </span>
        </div>
      ))}
    </div>
  );
}

export function StepQuote() {
  const rows = [
    { k: "Matériau", v: "ASA" },
    { k: "Impression", v: "3 h 20" },
    { k: "Quantité", v: "10" },
  ];
  return (
    <div className="rounded-lg border border-line bg-panel-2 p-3.5" aria-hidden>
      <div className="mb-3 flex h-5 overflow-hidden rounded-sm">
        <span className="w-[46%] bg-accent" />
        <span className="w-[24%] bg-accent-2" />
        <span className="w-[18%] bg-[#a8542f]" />
        <span className="flex-1 bg-fg/15" />
      </div>
      {rows.map((r) => (
        <div key={r.k} className="flex justify-between py-1 font-mono text-[11px]">
          <span className="text-muted">{r.k}</span>
          <span className="text-fg/90">{r.v}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between border-t border-line pt-2 font-mono text-[12px]">
        <span className="text-fg">Total</span>
        <span className="text-accent-2">38 €</span>
      </div>
    </div>
  );
}

export function StepPrint() {
  return (
    <div className="rounded-lg border border-line bg-panel-2 p-3.5" aria-hidden>
      <div className="flex items-center justify-between">
        <Mono>Impression en cours</Mono>
        <span className="font-mono text-[11px] text-emerald-400">64 %</span>
      </div>
      <svg viewBox="0 0 200 80" className="mt-3 w-full">
        <rect x="20" y="10" width="160" height="5" rx="2" fill="#3a3a3f" />
        <g className="animate-head">
          <rect x="84" y="2" width="32" height="20" rx="4" fill="#2a2a2e" stroke="currentColor" strokeOpacity="0.15" />
          <path d="M96 22h8l-4 6z" fill="#ff8a4c" />
        </g>
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={70 + i * 2} y={66 - i * 7} width={60 - i * 4} height="6" rx="2" fill="#f2542d" opacity={1 - i * 0.12} />
        ))}
        <rect x="40" y="72" width="120" height="5" rx="2" fill="#3a3a3f" />
      </svg>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fg/10">
        <span className="grow-x block h-full w-[64%] rounded-full bg-gradient-to-r from-accent to-accent-2" />
      </div>
    </div>
  );
}

// Carte « pièce auto » de la section mise en avant.
export function CarPartCard() {
  return (
    <div className="relative mx-auto w-full max-w-[380px]" aria-hidden>
      <div className="absolute -inset-6 rounded-3xl border border-dashed border-line" />
      <div className="relative animate-float rounded-xl border border-line bg-panel-2 p-4">
        <span className="grid size-8 place-items-center rounded-md border border-line">
          <Car size={15} className="text-accent-2" />
        </span>
        <Mono className="mt-3 block">Pièce d&apos;origine</Mono>
        <p className="font-mono text-sm text-fg">Introuvable · arrêt de fabrication</p>
      </div>
      <div className="relative mt-4 overflow-hidden rounded-xl border border-line-strong bg-gradient-to-br from-[#2a2a2e] via-[#1a1a1d] to-[#111113] p-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] tracking-[0.3em] text-fg/80">YRIS</span>
          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-400">Recréée</span>
        </div>
        <svg viewBox="0 0 200 90" className="mt-5 w-full">
          <path
            d="M30 70 L30 40 Q30 25 45 25 L90 25 L100 12 L125 12 L135 25 L160 25 Q172 25 172 40 L172 70 Z"
            fill="none"
            stroke="#ff8a4c"
            strokeWidth="1.5"
          />
          <circle cx="62" cy="48" r="9" fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth="1.5" />
          <circle cx="140" cy="48" r="9" fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth="1.5" />
          <line x1="30" x2="172" y1="82" y2="82" stroke="rgb(255 255 255 / 0.2)" strokeDasharray="3 3" />
          <text x="101" y="88" textAnchor="middle" fill="#8b8b92" fontSize="7" fontFamily="monospace">
            42,0 mm
          </text>
        </svg>
        <div className="mt-3 flex justify-between font-mono text-[11px]">
          <span className="text-muted">ASA · tient jusqu&apos;à 95 °C</span>
          <span className="text-fg">Aux cotes d&apos;origine</span>
        </div>
      </div>
    </div>
  );
}

const categoryIcons: Record<Category, LucideIcon> = {
  Auto: Car,
  Maison: House,
  Bureau: LampDesk,
  Pratique: Wrench,
};

export function CategoryGlyph({ category, className = "" }: { category: Category; className?: string }) {
  const Icon = categoryIcons[category];
  return (
    <div className={`grid-bg relative grid place-items-center overflow-hidden rounded-xl border border-line bg-panel-2 ${className}`}>
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-accent/10 to-transparent" />
      <Icon strokeWidth={1} className="relative size-1/3 text-fg/70" aria-hidden />
    </div>
  );
}
