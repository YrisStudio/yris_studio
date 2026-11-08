import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Heart, Package, Zap } from "lucide-react";
import { Container } from "@/components/ui";
import AuthForm from "./AuthForm";
import PrintVisual from "./PrintVisual";
import { authEnabled, getUser, safeNext } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false },
};

const reasons: Record<string, string> = {
  commande: "Connectez-vous pour passer commande et la retrouver dans votre compte.",
  favoris: "Connectez-vous pour enregistrer vos articles favoris.",
};

const perks = [
  { icon: Package, text: "Suivez chaque commande, de la réception à l'expédition." },
  { icon: Zap, text: "Des devis plus rapides : vos infos sont déjà remplies." },
  { icon: Heart, text: "Gardez vos articles préférés sous la main." },
];

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; raison?: string; mode?: string; erreur?: string }>;
}) {
  const { next: rawNext, raison, mode, erreur } = await searchParams;
  const next = safeNext(rawNext);
  if (await getUser()) redirect(next);

  return (
    <section className="grid-bg relative overflow-clip pb-20 pt-10 sm:pb-28 sm:pt-16">
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-fg/[0.05] blur-[140px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-fg/[0.05] blur-[140px]" />

      <Container className="relative max-w-[1040px]">
        <div className="grid overflow-clip rounded-3xl border border-line-strong bg-panel shadow-[0_50px_140px_-40px_rgb(0_0_0/0.9)] animate-rise lg:grid-cols-[1.05fr_1fr]">
          {/* Côté atelier : la pièce qui s'imprime */}
          <div className="relative border-b border-line bg-bg/40 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[90px]" />
            <div className="relative flex h-full flex-col">
              <div className="min-h-[250px] sm:min-h-[300px] lg:flex-1">
                <PrintVisual />
              </div>
              <ul className="mt-8 hidden space-y-3 lg:block">
                {perks.map((p) => (
                  <li key={p.text} className="flex items-start gap-3 text-sm text-fg/80">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-panel-2">
                      <p.icon size={14} className="text-accent-2" aria-hidden />
                    </span>
                    <span className="pt-1">{p.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Côté formulaire */}
          <div className="p-6 sm:p-10 lg:p-12">
            {erreur === "lien" && (
              <p role="alert" className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                Ce lien a expiré ou a déjà servi. Connectez-vous, ou recréez votre compte.
              </p>
            )}
            {authEnabled ? (
              <AuthForm
                next={next}
                initialMode={mode === "inscription" ? "inscription" : "connexion"}
                reason={raison ? reasons[raison] : undefined}
              />
            ) : (
              <p className="text-center text-sm text-muted">Les comptes ne sont pas encore activés sur ce site.</p>
            )}
            <p className="mt-8 border-t border-line pt-5 text-center text-xs text-muted">
              Pas besoin de compte pour visiter le site ou demander un devis.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
