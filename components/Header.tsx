"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, UserRound, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { nav } from "@/lib/site";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const loggedIn = useLoggedIn(pathname);
  const account = loggedIn
    ? { href: "/compte", label: "Mon compte" }
    : { href: `/connexion?next=${encodeURIComponent(pathname)}`, label: "Connexion" };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/75 backdrop-blur-xl">
      {/* Trois colonnes (1fr · auto · 1fr) : les liens sont centrés sur la page, quelle que soit la largeur du logo ou des boutons. */}
      <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-5 sm:px-6 md:grid md:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="justify-self-start font-mono text-sm font-medium tracking-[0.3em]" aria-label="Yris, accueil">
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

        <div className="hidden items-center gap-2 justify-self-end md:flex">
          {loggedIn !== null && (
            <Link
              href={account.href}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-fg/80 transition-colors hover:text-white"
            >
              <UserRound size={16} aria-hidden />
              {account.label}
            </Link>
          )}
          {/* Aura daisyUI : une lueur verte tourne autour du bouton (couleur donnée par .nav-aura). */}
          <div className="aura nav-aura">
            <Link
              href="/demande"
              className="block rounded-lg bg-panel-2 px-4 py-2 text-sm text-fg transition-colors hover:bg-[#222220]"
            >
              Demander un devis
            </Link>
          </div>
        </div>

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
          {[...nav, { href: "/demande", label: "Demander un devis" }, ...(loggedIn !== null ? [account] : [])].map((item) => (
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

// null tant qu'on ne sait pas encore (ou si les comptes ne sont pas activés), puis true/false.
// La connexion et la déconnexion se font côté serveur (cookies posés par une action serveur) :
// le navigateur n'en est pas prévenu, et l'en-tête ne se recharge pas d'une page à l'autre.
// On relit donc la session à chaque changement de page (lecture locale du cookie, sans requête).
function useLoggedIn(pathname: string) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setLoggedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setLoggedIn(Boolean(data.session));
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return loggedIn;
}
