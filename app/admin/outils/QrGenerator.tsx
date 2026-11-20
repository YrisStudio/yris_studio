"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";
import { site } from "@/lib/site";

const presets = [
  { label: "Site", value: site.url },
  { label: "Boutique", value: `${site.url}/boutique` },
  { label: "Demande de devis", value: `${site.url}/demande` },
  { label: "Signaler un souci", value: `${site.url}/signaler` },
];

const field =
  "w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-accent sm:text-[13px]";

// Générateur de QR codes (cartes de visite, étiquettes de colis, stands). Noir sur blanc : c'est ce qui se scanne le mieux.
export default function QrGenerator() {
  const [value, setValue] = useState(site.url);
  const [svg, setSvg] = useState("");
  const [png, setPng] = useState("");
  const text = value.trim();

  useEffect(() => {
    if (!text) return;
    let alive = true;
    const opts = { margin: 2, errorCorrectionLevel: "M" as const, color: { dark: "#0b0b0a", light: "#ffffff" } };
    Promise.all([QRCode.toString(text, { ...opts, type: "svg" }), QRCode.toDataURL(text, { ...opts, width: 1024 })])
      .then(([s, p]) => {
        if (!alive) return;
        setSvg(s);
        setPng(p);
      })
      .catch(() => alive && (setSvg(""), setPng("")));
    return () => {
      alive = false;
    };
  }, [text]);

  const name = `qr-${text.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").slice(0, 40) || "yris"}`;
  const svgUrl = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : "";
  const ready = Boolean(text && svg);

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
      <div>
        <label htmlFor="qr-text" className="mb-1 block text-[11.5px] text-muted">Lien ou texte</label>
        <input id="qr-text" value={value} onChange={(e) => setValue(e.target.value)} maxLength={500} className={field} />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setValue(p.value)}
              className={`rounded-full border px-2.5 py-0.5 text-[12px] ${value === p.value ? "border-accent text-accent" : "border-line text-muted hover:text-fg"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={ready ? png : undefined}
            download={`${name}.png`}
            aria-disabled={!ready}
            className={`inline-flex items-center gap-1.5 rounded-md bg-fg px-3 py-1.5 text-[12.5px] font-medium text-bg ${ready ? "" : "pointer-events-none opacity-50"}`}
          >
            <Download size={13} aria-hidden /> PNG
          </a>
          <a
            href={ready ? svgUrl : undefined}
            download={`${name}.svg`}
            aria-disabled={!ready}
            className={`inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[12.5px] ${ready ? "" : "pointer-events-none opacity-50"}`}
          >
            <Download size={13} aria-hidden /> SVG (impression)
          </a>
        </div>
      </div>
      <div className="grid aspect-square place-items-center rounded-md border border-line bg-white p-2">
        {ready ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={svgUrl} alt={`QR code vers ${text}`} className="h-full w-full" />
        ) : (
          <span className="text-[12px] text-neutral-500">Tape un lien</span>
        )}
      </div>
    </div>
  );
}
