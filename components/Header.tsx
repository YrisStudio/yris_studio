"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { nav } from "@/lib/site";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-5 sm:px-6">
        <Link href="/" className="font-mono text-sm font-medium tracking-[0.3em]" aria-label="Yris, accueil">
          YRIS
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-8 text-sm text-fg/80 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className="transition-colors hover:text-white aria-[current=page]:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/demande"
          className="hidden rounded-lg border border-line-strong bg-panel-2 px-4 py-2 text-sm transition-colors hover:bg-white/10 md:inline-flex"
        >
          Demander un devis
        </Link>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className="-mr-2 p-2 md:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <nav id="menu-mobile" aria-label="Navigation mobile" className="h-[calc(100dvh-4rem)] bg-bg px-6 pt-6 md:hidden">
          {[...nav, { href: "/demande", label: "Demander un devis" }].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block border-b border-line py-4 text-2xl font-medium tracking-tight"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
