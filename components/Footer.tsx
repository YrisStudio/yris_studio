import Link from "next/link";
import { nav, site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="border-t border-line text-sm text-muted">
      <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-5 py-14 sm:grid-cols-[1.5fr_1fr_1fr] sm:px-6">
        <div>
          <p className="font-mono text-sm font-medium tracking-[0.3em] text-fg">YRIS</p>
          <p className="mt-4 max-w-xs">{site.tagline}. Pièces auto, objets du quotidien, prototypes.</p>
        </div>
        <nav aria-label="Pied de page" className="flex flex-col gap-2.5">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-fg">
              {item.label}
            </Link>
          ))}
          <Link href="/demande" className="hover:text-fg">Demander un devis</Link>
        </nav>
        <div className="flex flex-col gap-2.5">
          <a href={`mailto:${site.email}`} className="hover:text-fg">{site.email}</a>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-2 border-t border-line px-5 py-6 text-xs sm:flex-row sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} {site.name}</p>
        <p>Prix « dès » indicatifs. Le prix final dépend de la taille, du matériau et de la quantité.</p>
      </div>
    </footer>
  );
}
