import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container, Eyebrow } from "@/components/ui";
import AuthForm from "./AuthForm";
import { authEnabled, getUser, safeNext } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false },
};

const reasons: Record<string, string> = {
  commande: "Connectez-vous pour passer commande et la retrouver dans votre compte.",
  favoris: "Connectez-vous pour enregistrer vos articles favoris.",
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; raison?: string; mode?: string; erreur?: string }>;
}) {
  const { next: rawNext, raison, mode, erreur } = await searchParams;
  const next = safeNext(rawNext);
  if (await getUser()) redirect(next);

  return (
    <section className="grid-bg relative overflow-hidden pb-24 pt-20 sm:pt-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-80 max-w-3xl rounded-full bg-accent/10 blur-[140px]" />
      <Container className="relative max-w-[440px]">
        <div className="text-center animate-rise">
          <Eyebrow>Mon compte</Eyebrow>
          <h1 className="mt-6 text-4xl font-medium tracking-tight sm:text-5xl">Bienvenue.</h1>
          <p className="mx-auto mt-3 max-w-sm text-[15px] text-muted">
            {(raison && reasons[raison]) ?? "Retrouvez vos commandes et vos favoris."}
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-line-strong bg-panel p-6 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)] animate-rise [animation-delay:150ms] sm:p-8">
          {erreur === "lien" && (
            <p role="alert" className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              Ce lien a expiré ou a déjà servi. Connectez-vous, ou recréez votre compte.
            </p>
          )}
          {authEnabled ? (
            <AuthForm next={next} initialMode={mode === "inscription" ? "inscription" : "connexion"} />
          ) : (
            <p className="text-center text-sm text-muted">Les comptes ne sont pas encore activés sur ce site.</p>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          Pas besoin de compte pour visiter le site ou demander un devis.
        </p>
      </Container>
    </section>
  );
}
