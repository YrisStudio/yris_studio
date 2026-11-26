import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Désinscription", robots: { index: false } };

// Lien « Se désinscrire » des newsletters : un seul clic, sans compte.
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  let ok = false;
  if (t && /^[0-9a-f-]{36}$/i.test(t)) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("newsletter_unsubscribe", { p_token: t });
    ok = !error;
  }
  return (
    <div className="theme-light min-h-[60vh]">
      <Container className="max-w-md py-24 text-center">
        <h1 className="text-3xl font-medium tracking-tight">{ok ? "C'est fait." : "Lien invalide"}</h1>
        <p className="mt-3 text-muted">
          {ok ? "Vous ne recevrez plus la newsletter de Yris Studio. Les emails liés à vos commandes continuent normalement." : "Ce lien de désinscription n'est pas valable. Écrivez-nous et on vous retire tout de suite."}
        </p>
        <Link href="/" className="mt-8 inline-flex rounded-lg border border-line-strong px-5 py-2.5 text-sm hover:border-fg">
          Retour au site
        </Link>
      </Container>
    </div>
  );
}
