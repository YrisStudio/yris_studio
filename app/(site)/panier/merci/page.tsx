import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import ClearCart from "./ClearCart";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Merci pour votre commande", robots: { index: false } };

// Stripe renvoie ici le client après un paiement accepté.
export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const safeRef = ref && /^#?[0-9A-Fa-f]{4,12}$/.test(ref) ? ref : null;

  return (
    <div className="theme-light min-h-[70vh]">
      <ClearCart />
      <Container className="py-20 text-center sm:py-28">
        <CheckCircle2 className="mx-auto size-14 text-accent" strokeWidth={1.5} aria-hidden />
        <h1 className="mt-5 text-4xl font-medium tracking-tight">Paiement accepté, merci !</h1>
        {safeRef && <p className="mt-2 font-mono text-sm text-muted">Commande {safeRef}</p>}
        <p className="mx-auto mt-4 max-w-md text-muted">
          Vous allez recevoir un email de confirmation dans quelques instants. On lance l&apos;impression et on vous prévient dès que c&apos;est prêt.
        </p>
        <Link href="/boutique" className="mt-8 inline-flex rounded-lg border border-line-strong px-5 py-2.5 text-sm hover:border-fg">
          Retour à la boutique
        </Link>
      </Container>
    </div>
  );
}
