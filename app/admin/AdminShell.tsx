"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Boxes,
  Percent,
  Repeat,
  FolderKanban,
  History,
  Wallet,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  CornerDownLeft,
  Inbox,
  Cylinder,
  LayoutDashboard,
  LifeBuoy,
  ListTodo,
  Loader2,
  Package,
  Users,
  Printer,
  Settings,
  Store,
  LogOut,
  Mail,
  Menu,
  Search,
  UserRound,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/app/(site)/connexion/actions";
import { searchAdmin, type SearchHit } from "./search";

type Item = { href: string; label: string; icon: LucideIcon; count?: number; alert?: boolean; keywords?: string };
type Group = { title: string; items: Item[] };

// Menu du gestionnaire : il se remplit au fur et à mesure que les pages sont reconstruites.
const allGroups: Group[] = [
  {
    title: "Pilotage",
    items: [
      { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, keywords: "accueil chiffres" },
      { href: "/admin/finances", label: "Finances", icon: Wallet, keywords: "factures dépenses marge urssaf seuils trésorerie export comptable" },
    ],
  },
  {
    title: "Ventes",
    items: [
      { href: "/admin/commandes", label: "Commandes", icon: Inbox, keywords: "devis kanban" },
      { href: "/admin/clients", label: "Clients", icon: Users, keywords: "clients pros fiches étiquettes notes" },
      { href: "/admin/produits", label: "Produits", icon: Store, keywords: "boutique articles photos prix couleurs catalogue collections stock statistiques" },
      { href: "/admin/promos", label: "Codes promo", icon: Percent, keywords: "réductions parrainage coupons" },
      { href: "/admin/recurrentes", label: "Récurrentes", icon: Repeat, keywords: "pros abonnement commandes régulières" },
    ],
  },
  {
    title: "Atelier",
    items: [
      { href: "/admin/atelier", label: "Impressions", icon: Printer, keywords: "atelier file planning imprimantes bambu ratés maintenance" },
      { href: "/admin/stock", label: "Stock", icon: Cylinder, keywords: "filament bobines consommables buses" },
      { href: "/admin/modeles", label: "Modèles 3D", icon: Boxes, keywords: "stl 3mf bibliothèque fichiers modèles" },
    ],
  },
  {
    title: "Assistance",
    items: [
      { href: "/admin/boite", label: "Boîte de réception", icon: Mail, keywords: "mails emails messages contact répondre" },
      { href: "/admin/sav", label: "SAV", icon: LifeBuoy, keywords: "signalements réclamations retours réimpression" },
    ],
  },
  {
    title: "Organisation",
    items: [
      { href: "/admin/calendrier", label: "Calendrier", icon: CalendarDays, keywords: "planning dates livraisons agenda" },
      { href: "/admin/todo", label: "To-do", icon: ListTodo, keywords: "tâches idées qui fait quoi" },
      { href: "/admin/projets", label: "Projets", icon: FolderKanban, keywords: "kanban chantiers salon partenariat" },
      { href: "/admin/activite", label: "Journal", icon: History, keywords: "activité historique qui a fait quoi" },
      { href: "/admin/outils", label: "Outils", icon: Wrench, keywords: "calculateur prix qr code" },
    ],
  },
  {
    title: "Réglages",
    items: [{ href: "/admin/parametres", label: "Paramètres", icon: Settings, keywords: "tarifs prix réglages entreprise siret adresse" }],
  },
];

// Menu replié : préférence gardée sur cet appareil (localStorage), lue sans décalage à l'affichage.
const COLLAPSED_KEY = "admin:collapsed";
const collapsedListeners = new Set<() => void>();
function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}
function useCollapsed() {
  return useSyncExternalStore(
    (cb) => {
      collapsedListeners.add(cb);
      return () => collapsedListeners.delete(cb);
    },
    readCollapsed,
    () => false,
  );
}
function toggleCollapsed() {
  try {
    localStorage.setItem(COLLAPSED_KEY, readCollapsed() ? "0" : "1");
  } catch {}
  collapsedListeners.forEach((cb) => cb());
}

// Onglets du bas sur téléphone : les pages les plus utilisées au pouce.
const tabs: Item[] = [
  { href: "/admin", label: "Accueil", icon: LayoutDashboard },
  { href: "/admin/commandes", label: "Commandes", icon: Inbox },
  { href: "/admin/atelier", label: "Atelier", icon: Printer },
  { href: "/admin/stock", label: "Stock", icon: Cylinder },
];

function useIsActive() {
  const pathname = usePathname();
  const params = useSearchParams();
  // Lien actif : même chemin, et même filtre quand il y en a un (statut ou vue, avec leur valeur par défaut).
  return useCallback(
    (href: string, loose = false) => {
      const url = new URL(href, "http://x");
      // Une sous-page (ex. la fiche d'une commande) garde son entrée du menu active.
      const sub = url.pathname !== "/admin" && pathname.startsWith(`${url.pathname}/`);
      if (url.pathname !== pathname && !sub) return false;
      if (sub) return true;
      if (loose) return true;
      for (const [k, v] of url.searchParams) {
        const current = params.get(k) ?? (k === "statut" ? "a-realiser" : k === "vue" ? "nouveaux" : null);
        if (current !== v) return false;
      }
      return true;
    },
    [pathname, params],
  );
}

function Count({ item, compact = false }: { item: Item; compact?: boolean }) {
  if (item.count === undefined) return null;
  if (compact)
    return item.alert ? <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" aria-hidden /> : null;
  return (
    <span
      className={`min-w-5 rounded px-1 py-px text-center font-mono text-[10.5px] tabular-nums ${
        item.alert ? "bg-accent/15 text-accent" : "text-muted"
      }`}
    >
      {item.count}
    </span>
  );
}

export default function AdminShell({ email, name, manager, children }: { email: string; name: string; manager: boolean; children: React.ReactNode }) {
  // Paramètres (tarifs, entreprise, équipe) : réservés aux gérants.
  const groups = manager ? allGroups : allGroups.map((g) => ({ ...g, items: g.items.filter((it) => it.href !== "/admin/parametres") })).filter((g) => g.items.length);
  const isActive = useIsActive();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const collapsed = useCollapsed();
  const [palette, setPalette] = useState(false);

  // Ctrl+K (ou Cmd+K) ouvre la palette de commandes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fermer le menu mobile à chaque changement de page.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setDrawer(false);
  }

  const current = groups.flatMap((g) => g.items).find((it) => isActive(it.href)) ?? groups.flatMap((g) => g.items).find((it) => isActive(it.href, true));
  const section = groups.find((g) => g.items.includes(current!))?.title;

  const sidebar = (mobile: boolean) => {
    const mini = collapsed && !mobile;
    return (
      <div className="flex h-full flex-col">
        <div className={`flex h-14 shrink-0 items-center border-b border-line ${mini ? "justify-center px-2" : "justify-between px-4"}`}>
          <Link href="/admin" className="flex items-center gap-2" title="Gestionnaire Yris">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/yris-mark-transparent.svg" alt="" width={18} height={18} className="h-[18px] w-auto" />
            {!mini && (
              <>
                <span className="font-mono text-[13px] font-medium tracking-[0.28em]">YRIS</span>
                <span className="rounded bg-accent/15 px-1.5 py-px font-mono text-[9.5px] uppercase tracking-wider text-accent">Gestion</span>
              </>
            )}
          </Link>
          {mobile && (
            <button type="button" onClick={() => setDrawer(false)} aria-label="Fermer le menu" className="-mr-1.5 p-1.5 text-muted hover:text-fg">
              <X size={18} />
            </button>
          )}
        </div>

        {!mini && (
          <div className="px-3 pt-3">
            <button
              type="button"
              onClick={() => setPalette(true)}
              className="flex w-full items-center gap-2 rounded-md border border-line bg-panel px-2.5 py-1.5 text-[13px] text-muted transition hover:border-line-strong hover:text-fg"
            >
              <Search size={14} aria-hidden />
              <span className="flex-1 text-left">Rechercher…</span>
              <kbd className="rounded border border-line px-1 font-mono text-[10px]">Ctrl K</kbd>
            </button>
          </div>
        )}

        <nav
          aria-label="Gestionnaire"
          className={`flex-1 overflow-y-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${mini ? "px-2" : "px-2.5"}`}
        >
          {groups.map((g) => (
            <div key={g.title} className="mb-4">
              {mini ? (
                <div className="mx-auto mb-1.5 h-px w-6 bg-line" aria-hidden />
              ) : (
                <p className="mb-1 px-2 text-[11px] font-medium text-muted/80">{g.title}</p>
              )}
              <ul className="space-y-px">
                {g.items.map((it) => {
                  const active = isActive(it.href);
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        title={mini ? it.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={`relative flex items-center gap-2.5 rounded-md text-[13px] transition-colors ${
                          mini ? "justify-center p-2" : "px-2 py-1.5"
                        } ${active ? "bg-fg/[0.07] text-fg" : "text-fg/65 hover:bg-fg/[0.04] hover:text-fg"}`}
                      >
                        {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" aria-hidden />}
                        <it.icon size={15} className={active ? "text-accent" : "text-muted"} aria-hidden />
                        {!mini && <span className="flex-1 truncate">{it.label}</span>}
                        <Count item={it} compact={mini} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={`shrink-0 border-t border-line py-2 ${mini ? "px-2" : "px-2.5"}`}>
          <Link
            href="/"
            title={mini ? "Voir le site" : undefined}
            className={`flex items-center gap-2.5 rounded-md text-[13px] text-fg/65 hover:bg-fg/[0.04] hover:text-fg ${mini ? "justify-center p-2" : "px-2 py-1.5"}`}
          >
            <ArrowUpRight size={15} className="text-muted" aria-hidden />
            {!mini && "Voir le site"}
          </Link>
          <Link
            href="/compte"
            title={mini ? "Mon compte" : undefined}
            className={`flex items-center gap-2.5 rounded-md text-[13px] text-fg/65 hover:bg-fg/[0.04] hover:text-fg ${mini ? "justify-center p-2" : "px-2 py-1.5"}`}
          >
            <UserRound size={15} className="text-muted" aria-hidden />
            {!mini && "Mon compte"}
          </Link>
          {!mobile && (
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? "Déplier le menu" : "Replier le menu"}
              className={`flex w-full items-center gap-2.5 rounded-md text-[13px] text-fg/65 hover:bg-fg/[0.04] hover:text-fg ${mini ? "justify-center p-2" : "px-2 py-1.5"}`}
            >
              {collapsed ? <ChevronsRight size={15} className="text-muted" aria-hidden /> : <ChevronsLeft size={15} className="text-muted" aria-hidden />}
              {!mini && "Replier le menu"}
            </button>
          )}
          <div className={`mt-2 flex items-center gap-2 rounded-md border border-line ${mini ? "flex-col p-1.5" : "px-2 py-1.5"}`}>
            <span className="grid size-6 shrink-0 place-items-center rounded bg-accent text-[11px] font-semibold text-on-accent" title={`${name} · ${email}`}>
              {name.charAt(0).toUpperCase()}
            </span>
            {!mini && (
              <span className="min-w-0 flex-1 truncate text-[12px] text-fg/85" title={email}>
                {name}
              </span>
            )}
            <form action={signOut}>
              <button type="submit" aria-label="Se déconnecter" title="Se déconnecter" className="p-1 text-muted hover:text-fg">
                <LogOut size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-app flex min-h-screen flex-1 bg-bg text-fg">
      {/* Menu latéral (ordinateur) */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-line bg-panel/40 transition-[width] duration-200 lg:block ${
          collapsed ? "w-[60px]" : "w-[232px]"
        }`}
      >
        {sidebar(false)}
      </aside>

      {/* Menu latéral (téléphone) */}
      {drawer && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden" onClick={() => setDrawer(false)} aria-hidden />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[272px] border-r border-line bg-bg transition-transform duration-200 lg:hidden ${
          drawer ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!drawer}
      >
        {sidebar(true)}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre du haut */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg/85 px-3 backdrop-blur-xl sm:px-5">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Ouvrir le menu" aria-expanded={drawer} className="-ml-1 p-1.5 text-muted hover:text-fg lg:hidden">
            <Menu size={19} />
          </button>
          <nav aria-label="Fil d'Ariane" className="flex min-w-0 items-center gap-1.5 text-[13px]">
            {section && <span className="hidden text-muted sm:inline">{section}</span>}
            {section && <span className="hidden text-muted/50 sm:inline">/</span>}
            <span className="truncate font-medium">{current?.label ?? "Gestionnaire"}</span>
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPalette(true)}
              aria-label="Rechercher"
              className="flex items-center gap-2 rounded-md border border-line px-2 py-1 text-[12.5px] text-muted transition hover:border-line-strong hover:text-fg"
            >
              <Search size={14} aria-hidden />
              <span className="hidden md:inline">Rechercher</span>
              <kbd className="hidden rounded border border-line px-1 font-mono text-[10px] md:inline">Ctrl K</kbd>
            </button>
            <Link
              href="/"
              className="hidden items-center gap-1 rounded-md px-2 py-1 text-[12.5px] text-muted transition hover:text-fg sm:flex"
            >
              Site <ArrowUpRight size={13} aria-hidden />
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1280px] px-3 pb-28 pt-5 sm:px-6 sm:pt-7 lg:pb-14">{children}</div>
        </main>
      </div>

      {/* Onglets du bas (téléphone) */}
      <nav
        aria-label="Raccourcis"
        style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        {tabs.map((t) => {
          const active = isActive(t.href, true);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10.5px] ${active ? "text-accent" : "text-muted"}`}
            >
              <t.icon size={19} aria-hidden />
              {t.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => setDrawer(true)} className="flex flex-col items-center gap-0.5 py-2 text-[10.5px] text-muted">
          <Menu size={19} aria-hidden />
          Menu
        </button>
      </nav>

      {palette && <CommandPalette groups={groups} onClose={() => setPalette(false)} />}
    </div>
  );
}

// Palette de commandes : aller n'importe où, et chercher dans les données (commandes, clients, stock…).
type Entry = { href: string; label: string; icon: LucideIcon; group: string; sub?: string; keywords?: string };

const hitMeta: Record<SearchHit["kind"], { group: string; icon: LucideIcon }> = {
  commande: { group: "Commandes", icon: Inbox },
  client: { group: "Clients", icon: Users },
  bobine: { group: "Stock", icon: Cylinder },
  consommable: { group: "Stock", icon: Package },
  imprimante: { group: "Imprimantes", icon: Printer },
  sav: { group: "SAV", icon: LifeBuoy },
  tache: { group: "To-do", icon: ListTodo },
};

const fold = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

function CommandPalette({ groups, onClose }: { groups: Group[]; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [hits, setHits] = useState<{ q: string; items: SearchHit[] }>({ q: "", items: [] });
  const inputRef = useRef<HTMLInputElement>(null);
  const q = query.trim();
  const searching = q.length >= 2 && hits.q !== q;

  // Recherche dans la base, 200 ms après la dernière frappe (seule la réponse la plus récente compte).
  useEffect(() => {
    if (q.length < 2) return;
    let alive = true;
    const t = setTimeout(async () => {
      const items = await searchAdmin(q).catch(() => []);
      if (alive) setHits({ q, items });
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const entries = useMemo<Entry[]>(() => {
    const pages: Entry[] = [
      ...groups.flatMap((g) => g.items.map((it) => ({ ...it, group: g.title }))),
      { href: "/", label: "Voir le site", icon: ArrowUpRight, group: "Aller à", keywords: "accueil public" },
      { href: "/compte", label: "Mon compte", icon: UserRound, group: "Aller à" },
    ];
    const f = fold(q);
    if (!f) return pages;
    const matchingPages = pages.filter((e) => fold(`${e.label} ${e.group} ${e.keywords ?? ""}`).includes(f));
    const data = hits.q === q ? hits.items.map((h) => ({ href: h.href, label: h.title, sub: h.subtitle, ...hitMeta[h.kind] })) : [];
    return [...matchingPages, ...data];
  }, [groups, q, hits]);

  useEffect(() => inputRef.current?.focus(), []);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, entries.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && entries[index]) {
      e.preventDefault();
      go(entries[index].href);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-3 pt-[12vh] backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rechercher"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="w-full max-w-[600px] overflow-hidden rounded-xl border border-line-strong bg-panel shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)]"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-3.5">
          {searching ? <Loader2 size={16} className="animate-spin text-muted" aria-hidden /> : <Search size={16} className="text-muted" aria-hidden />}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            placeholder="Page, client, commande, bobine…"
            aria-label="Rechercher une page ou une donnée"
            className="h-12 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-muted/70 sm:text-[15px]"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted sm:block">Échap</kbd>
        </div>
        <ul role="listbox" className="max-h-[55vh] overflow-y-auto p-1.5">
          {entries.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted">{searching ? "Recherche…" : "Aucun résultat."}</li>
          )}
          {entries.map((e, i) => (
            <li key={`${e.href}-${e.label}-${i}`} role="option" aria-selected={i === index}>
              {(i === 0 || entries[i - 1].group !== e.group) && q && (
                <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-medium uppercase tracking-wide text-muted">{e.group}</p>
              )}
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => go(e.href)}
                className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-[13.5px] ${
                  i === index ? "bg-fg/[0.07] text-fg" : "text-fg/75"
                }`}
              >
                <e.icon size={15} className={`shrink-0 ${i === index ? "text-accent" : "text-muted"}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{e.label}</span>
                  {e.sub && <span className="block truncate text-[11.5px] text-muted">{e.sub}</span>}
                </span>
                {!q && <span className="text-[11.5px] text-muted">{e.group}</span>}
                {i === index && <CornerDownLeft size={13} className="shrink-0 text-muted" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
