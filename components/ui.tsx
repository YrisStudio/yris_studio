import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1120px] px-5 sm:px-6 ${className}`}>{children}</div>;
}

const btn =
  "inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

// Bouton principal orange, et bouton secondaire sombre avec chevron.
export function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`${btn} shine bg-gradient-to-b from-accent-2 to-accent text-white shadow-[0_8px_30px_-8px_rgb(242_84_45/0.7),inset_0_1px_0_rgb(255_255_255/0.25)] hover:brightness-110`}
    >
      {children}
    </Link>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`${btn} group border border-line-strong bg-panel-2 text-fg hover:bg-fg/10`}
    >
      {children}
      <ChevronRight size={15} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-0.5 text-sm font-medium text-accent hover:text-fg">
      {children}
      <ChevronRight size={15} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

// Petite étiquette en police mono, en capitales.
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-md border border-line-strong bg-panel-2 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-fg/80">
      {children}
    </span>
  );
}

export function SectionTitle({ eyebrow, title, intro }: { eyebrow: string; title: React.ReactNode; intro?: string }) {
  return (
    <div className="mx-auto mb-14 max-w-2xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-5 text-[34px] font-medium leading-[1.1] tracking-tight sm:text-5xl">{title}</h2>
      {intro && <p className="mx-auto mt-4 max-w-md text-[15px] text-muted">{intro}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line bg-panel ${className}`}>{children}</div>
  );
}

// Étiquette mono discrète utilisée dans les mini-interfaces.
export function Mono({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-[10px] uppercase tracking-wider text-muted ${className}`}>{children}</span>;
}
