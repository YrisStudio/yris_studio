import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MfaChallenge from "./MfaChallenge";
import { Container } from "@/components/ui";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Vérification", robots: { index: false } };

// Deuxième étape de connexion au gestionnaire : le code à 6 chiffres de l'appli d'authentification.
export default async function VerificationPage() {
  if (!(await getUser())) redirect("/connexion?next=/admin");
  return (
    <div className="theme-light min-h-[70vh]">
      <Container className="max-w-sm py-20">
        <h1 className="text-3xl font-medium tracking-tight">Vérification</h1>
        <p className="mt-2 text-muted">Ouvrez votre appli d&apos;authentification et saisissez le code à 6 chiffres affiché pour Yris.</p>
        <MfaChallenge />
      </Container>
    </div>
  );
}
