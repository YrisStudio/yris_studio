import Link from "next/link";
import { Container } from "@/components/ui";
import { LEGAL_UPDATED, legalLinks } from "@/lib/legal";

// Mise en page commune des pages légales : titre, sommaire des autres pages, texte lisible.
export default function LegalPage({ title, current, children }: { title: string; current: string; children: React.ReactNode }) {
  return (
    <div className="theme-light">
      <Container className="max-w-3xl py-16 sm:py-20">
        <nav aria-label="Pages légales" className="flex flex-wrap gap-2">
          {legalLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.href === current ? "page" : undefined}
              className="rounded-full border border-line-strong px-3 py-1 text-xs text-muted hover:text-fg aria-[current=page]:border-fg aria-[current=page]:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <h1 className="mt-8 text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Dernière mise à jour : {LEGAL_UPDATED}</p>
        <div className="legal mt-10 space-y-4 text-[15px] leading-relaxed text-fg/85 [&_a]:text-accent [&_a]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-medium [&_h2]:text-fg [&_h3]:mt-6 [&_h3]:font-medium [&_h3]:text-fg [&_li]:mt-1 [&_strong]:font-medium [&_strong]:text-fg [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </Container>
    </div>
  );
}
