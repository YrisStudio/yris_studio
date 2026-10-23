import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Logo from "@/components/Logo";
import { nav, site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:grid-cols-3 sm:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">
            Des sites web dont on se souvient, conçus avec soin.
          </p>
        </div>

        <nav aria-label="Pied de page" className="flex flex-col gap-2 text-sm">
          <Link href="/" className="text-muted hover:text-ink">Accueil</Link>
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-muted hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-2 text-sm">
          <a href={`mailto:${site.email}`} className="inline-flex items-center gap-1 text-muted hover:text-ink">
            {site.email}
            <ArrowUpRight size={14} aria-hidden />
          </a>
          <a
            href={site.x.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted hover:text-ink"
          >
            {site.x.handle} sur X
            <ArrowUpRight size={14} aria-hidden />
          </a>
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-5 pb-10 text-xs text-muted sm:px-8">
        © {new Date().getFullYear()} {site.name}. Tous droits réservés.
      </div>
    </footer>
  );
}
