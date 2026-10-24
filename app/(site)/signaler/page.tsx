import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui";
import ReportForm from "./ReportForm";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Signaler un problème",
  description: "Un souci avec une commande, le site ou votre compte ? Prévenez-nous.",
};

export default async function SignalerPage({
  searchParams,
}: {
  searchParams: Promise<{ sujet?: string; commande?: string }>;
}) {
  const { sujet, commande } = await searchParams;
  const user = await getUser();
  const formUser = user ? { name: String(user.user_metadata?.full_name ?? ""), email: user.email ?? "" } : null;

  return (
    <section className="grid-bg relative overflow-hidden pb-24 pt-20 sm:pt-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-80 max-w-3xl rounded-full bg-accent/10 blur-[140px]" />
      <Container className="relative max-w-[640px]">
        <div className="text-center animate-rise">
          <Eyebrow>Assistance</Eyebrow>
          <h1 className="mt-6 text-4xl font-medium tracking-tight sm:text-6xl">Signaler un problème.</h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-muted">
            Une commande, le site, votre compte, ou n&apos;importe quoi d&apos;autre : dites-nous tout.
          </p>
        </div>
        <div className="mt-12 rounded-2xl border border-line-strong bg-panel p-6 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)] animate-rise [animation-delay:150ms] sm:p-8">
          <ReportForm user={formUser} initialCategory={sujet} initialOrder={commande} />
        </div>
      </Container>
    </section>
  );
}
