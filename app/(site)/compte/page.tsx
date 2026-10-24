import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Heart, LifeBuoy, LogOut, Package, Settings, ShieldCheck, Timer } from "lucide-react";
import { signOut } from "@/app/(site)/connexion/actions";
import { CountUp, Spotlight } from "@/components/motion";
import { ProductCard, stagger } from "@/components/sections";
import { Container, Mono, PrimaryLink, TextLink } from "@/components/ui";
import { getFavoriteSlugs } from "@/lib/favorites";
import { isAdmin } from "@/lib/admin";
import { formatPrice, orderRef, products, requestTypes } from "@/lib/site";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Mon compte",
  robots: { index: false },
};

type Order = {
  id: string;
  kind: string;
  product_name: string | null;
  quantity: number;
  material: string | null;
  details: string | null;
  estimated_cents: number | null;
  final_cents: number | null;
  status: string;
  created_at: string;
};

// Étapes de suivi d'une commande, dans l'ordre.
const steps = ["reçue", "devis envoyé", "en impression", "terminée"];

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

function Tracker({ status }: { status: string }) {
  if (status === "annulée") {
    return (
      <span className="rounded-md bg-red-500/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-red-600">
        Annulée
      </span>
    );
  }
  const current = Math.max(0, steps.indexOf(status));
  return (
    <ol className="flex items-center" aria-label={`Statut : ${status}`}>
      {steps.map((s, i) => {
        const done = i < current || status === "terminée";
        const active = i === current && status !== "terminée";
        return (
          <li key={s} className="flex items-center">
            {i > 0 && <span className={`h-px w-6 sm:w-10 ${i <= current ? "bg-accent" : "bg-line-strong"}`} />}
            <span
              title={s}
              className={`relative grid size-6 place-items-center rounded-full border text-[10px] transition-colors ${
                done
                  ? "border-accent bg-accent text-white"
                  : active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line-strong text-muted"
              }`}
            >
              {done ? <Check size={12} strokeWidth={3} /> : i + 1}
              {active && <span className="absolute size-6 animate-ping rounded-full bg-accent/30" />}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function ComptePage() {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/compte");

  const supabase = await createClient();
  const [{ data }, favoriteSlugs] = await Promise.all([
    supabase
      .from("orders")
      .select("id, kind, product_name, quantity, material, details, estimated_cents, final_cents, status, created_at")
      // Un admin peut lire toutes les commandes : ici on ne veut que les siennes.
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    getFavoriteSlugs(),
  ]);
  const admin = await isAdmin();
  const orders = (data ?? []) as Order[];
  const favorites = products.filter((p) => favoriteSlugs.has(p.slug));
  const inProgress = orders.filter((o) => o.status !== "terminée" && o.status !== "annulée").length;

  const fullName = String(user.user_metadata?.full_name ?? "").trim();
  const firstName = fullName.split(" ")[0];
  const initial = (firstName || user.email || "?").charAt(0).toUpperCase();

  const stats = [
    { label: "Commandes et devis", value: orders.length, icon: Package },
    { label: "En cours", value: inProgress, icon: Timer },
    { label: "Favoris", value: favorites.length, icon: Heart },
  ];

  return (
    <>
      <section className="grid-bg relative overflow-hidden pb-16 pt-16 sm:pt-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-72 max-w-3xl rounded-full bg-accent/10 blur-[140px]" />
        <Container className="relative">
          <div className="flex flex-wrap items-center justify-between gap-6 animate-rise">
            <div className="flex items-center gap-5">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-2xl font-medium text-white shadow-[0_12px_40px_-12px_rgb(242_84_45/0.8)] sm:size-20 sm:text-3xl">
                {initial}
              </span>
              <div>
                <h1 className="text-3xl font-medium tracking-tight sm:text-5xl">
                  Bonjour{firstName ? `, ${firstName}` : ""}.
                </h1>
                <p className="mt-1.5 font-mono text-xs text-muted sm:text-sm">
                  {user.email} · membre depuis {monthFmt.format(new Date(user.created_at))}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {admin && (
                <Link
                  href="/admin"
                  className="shine inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-b from-accent-2 to-accent px-4 text-sm font-medium text-white shadow-[0_8px_30px_-8px_rgb(242_84_45/0.7)] transition hover:brightness-110"
                >
                  <ShieldCheck size={16} aria-hidden />
                  Espace administrateur
                </Link>
              )}
              <Link
                href="/compte/parametres"
                aria-label="Paramètres du compte"
                title="Paramètres"
                className="group grid size-10 place-items-center rounded-lg border border-line-strong bg-panel-2 transition-colors hover:border-accent"
              >
                <Settings size={18} className="transition-transform duration-500 group-hover:rotate-90" aria-hidden />
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-panel-2 px-4 text-sm transition-colors hover:bg-fg/10"
                >
                  <LogOut size={15} aria-hidden />
                  Se déconnecter
                </button>
              </form>
            </div>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            {stats.map((s, i) => (
              <div key={s.label} data-reveal style={stagger(i)}>
                <Spotlight className="p-5">
                  <div className="flex items-center justify-between">
                    <Mono>{s.label}</Mono>
                    <s.icon size={16} className="text-accent-2" aria-hidden />
                  </div>
                  <p className="mt-4 text-4xl font-medium tracking-tight">
                    <CountUp to={s.value} duration={900} />
                  </p>
                </Spotlight>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="theme-light py-20">
        <Container>
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">Mes commandes</h2>
            {orders.length > 0 && <TextLink href="/boutique">Nouvelle commande</TextLink>}
          </div>

          {orders.length > 0 ? (
            <ul className="mt-8 space-y-3">
              {orders.map((o, i) => {
                const type = requestTypes.find((t) => t.id === o.kind);
                return (
                  <li key={o.id} data-reveal style={stagger(Math.min(i, 8), 60)}>
                    <Spotlight className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-fg/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                            {type?.label ?? o.kind}
                          </span>
                          <Mono>
                            {orderRef(o.id)} · {dateFmt.format(new Date(o.created_at))}
                          </Mono>
                        </div>
                        <p className="mt-2 truncate text-lg font-medium tracking-tight">
                          {o.product_name ?? o.details?.slice(0, 80) ?? "Demande"}
                          {o.quantity > 1 && <span className="text-muted"> × {o.quantity}</span>}
                        </p>
                        <p className="mt-0.5 text-sm text-muted">
                          {[
                            o.material,
                            o.final_cents !== null
                              ? formatPrice(o.final_cents)
                              : o.estimated_cents !== null
                                ? `${formatPrice(o.estimated_cents)} estimé`
                                : "Devis à venir",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 lg:items-end">
                        <Tracker status={o.status} />
                        <Mono className="text-fg/70">{o.status}</Mono>
                        <Link
                          href={`/signaler?sujet=commande&commande=${orderRef(o.id).slice(1)}`}
                          className="relative inline-flex items-center gap-1 text-xs text-muted hover:text-accent"
                        >
                          <LifeBuoy size={12} aria-hidden />
                          Un problème ?
                        </Link>
                      </div>
                    </Spotlight>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-line-strong p-12 text-center">
              <Package className="mx-auto size-10 text-muted" strokeWidth={1.25} aria-hidden />
              <p className="mt-4 text-lg font-medium">Pas encore de commande.</p>
              <p className="mt-1 text-sm text-muted">Vos commandes et demandes de devis apparaîtront ici, avec leur suivi.</p>
              <div className="mt-6">
                <PrimaryLink href="/boutique">Voir la boutique</PrimaryLink>
              </div>
            </div>
          )}

          <h2 className="mt-20 text-2xl font-medium tracking-tight sm:text-3xl">Mes favoris</h2>
          {favorites.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((p, i) => (
                <ProductCard key={p.slug} product={p} index={i} favorite />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-line-strong p-12 text-center">
              <Heart className="mx-auto size-10 text-muted" strokeWidth={1.25} aria-hidden />
              <p className="mt-4 text-lg font-medium">Aucun favori.</p>
              <p className="mt-1 text-sm text-muted">Touchez le cœur d&apos;un article pour le retrouver ici.</p>
              <div className="mt-5">
                <TextLink href="/boutique">Parcourir la boutique</TextLink>
              </div>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
