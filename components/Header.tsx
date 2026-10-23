"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Logo from "@/components/Logo";
import { nav } from "@/lib/site";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 sm:flex">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            const isContact = item.href === "/contact";
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  isContact
                    ? "ml-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink/85"
                    : `rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-cloud ${
                        active ? "bg-cloud text-ink" : "text-muted"
                      }`
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className="-mr-2 rounded-full p-2 sm:hidden"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav id="menu-mobile" aria-label="Navigation mobile" className="border-t border-line bg-white px-5 pb-6 pt-2 sm:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
              className="block rounded-2xl px-3 py-3 text-lg font-medium hover:bg-cloud"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
