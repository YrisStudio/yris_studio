"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Cylinder,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  MessageSquareWarning,
  RotateCcw,
  UserRound,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/app/(site)/connexion/actions";

export type AdminCounts = {
  open: number;
  done: number;
  cancelled: number;
  all: number;
  reportsNew: number;
  reportsDone: number;
  lowStock: number;
};

type Item = { href: string; label: string; icon: LucideIcon; count?: number; alert?: boolean };

export default function AdminSidebar({ counts, email }: { counts: AdminCounts; email: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const groups: { title: string; items: Item[] }[] = [
    { title: "Pilotage", items: [{ href: "/admin", label: "Tableau de bord", icon: LayoutDashboard }] },
    {
      title: "Commandes",
      items: [
        { href: "/admin/commandes?statut=a-realiser", label: "À réaliser", icon: Clock, count: counts.open, alert: counts.open > 0 },
        { href: "/admin/commandes?statut=terminees", label: "Terminées", icon: CheckCircle2, count: counts.done },
        { href: "/admin/commandes?statut=annulees", label: "Annulées", icon: XCircle, count: counts.cancelled },
        { href: "/admin/commandes?statut=toutes", label: "Toutes", icon: ListOrdered, count: counts.all },
      ],
    },
    {
      title: "Atelier",
      items: [
        { href: "/admin/stock", label: "Stock de filament", icon: Cylinder, count: counts.lowStock || undefined, alert: counts.lowStock > 0 },
      ],
    },
    { title: "Clients", items: [{ href: "/admin/clients", label: "Tous les clients", icon: Users }] },
    {
      title: "Assistance",
      items: [
        {
          href: "/admin/signalements?vue=nouveaux",
          label: "À traiter",
          icon: MessageSquareWarning,
          count: counts.reportsNew,
          alert: counts.reportsNew > 0,
        },
        { href: "/admin/signalements?vue=traites", label: "Traités", icon: RotateCcw, count: counts.reportsDone },
      ],
    },
  ];

  // Lien actif : même chemin, et même filtre quand il y en a un (statut ou vue, avec leur valeur par défaut).
  function isActive(href: string) {
    const url = new URL(href, "http://x");
    if (url.pathname !== pathname) return false;
    for (const [k, v] of url.searchParams) {
      const current = params.get(k) ?? (k === "statut" ? "a-realiser" : k === "vue" ? "nouveaux" : null);
      if (current !== v) return false;
    }
    return true;
  }

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/admin" className="flex items-baseline gap-2" onClick={() => setOpen(false)}>
          <span className="font-mono text-sm font-medium tracking-[0.3em]">YRIS</span>
          <span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent-2">
            Gestion
          </span>
        </Link>
        <button type="button" onClick={() => setOpen(false)} aria-label="Fermer le menu" className="-mr-2 p-2 lg:hidden">
          <X size={18} />
        </button>
      </div>

      <nav aria-label="Gestionnaire" className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-wider text-muted">{g.title}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = isActive(it.href);
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        active ? "bg-white/10 text-white" : "text-fg/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <it.icon size={16} className={active ? "text-accent-2" : "text-muted group-hover:text-fg"} aria-hidden />
                      <span className="flex-1">{it.label}</span>
                      {it.count !== undefined && (
                        <span
                          className={`min-w-6 rounded-md px-1.5 py-0.5 text-center font-mono text-[11px] ${
                            it.alert ? "bg-accent text-white" : "bg-white/5 text-muted"
                          }`}
                        >
                          {it.count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-line px-3 py-4">
        <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg/70 hover:bg-white/5 hover:text-white">
          <ArrowUpRight size={16} className="text-muted" aria-hidden />
          Voir le site
        </Link>
        <Link href="/compte" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg/70 hover:bg-white/5 hover:text-white">
          <UserRound size={16} className="text-muted" aria-hidden />
          Mon compte
        </Link>
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-gradient-to-br from-accent-2 to-accent text-sm font-medium text-white">
            {email.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted">{email}</span>
          <form action={signOut}>
            <button type="submit" aria-label="Se déconnecter" title="Se déconnecter" className="p-1 text-muted hover:text-white">
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Barre du haut, sur mobile uniquement. */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Ouvrir le menu" aria-expanded={open} className="-ml-2 p-2">
          <Menu size={20} />
        </button>
        <span className="font-mono text-sm tracking-[0.3em]">YRIS</span>
        <span className="w-9" />
      </div>

      {/* Fond sombre derrière le menu ouvert, sur mobile. */}
      {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[264px] border-r border-line bg-bg transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {nav}
      </aside>
    </>
  );
}
