import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import { Container } from "@/components/ui";
import SettingsForm, { field, label } from "./SettingsForm";
import { updateEmail, updateName, updatePassword } from "./actions";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Paramètres",
  robots: { index: false },
};

export default async function ParametresPage() {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/compte/parametres");
  const name = String(user.user_metadata?.full_name ?? "");
  const pendingEmail = user.new_email;

  return (
    <>
      <section className="grid-bg relative overflow-hidden pb-14 pt-16 sm:pt-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-64 max-w-3xl rounded-full bg-accent/10 blur-[140px]" />
        <Container className="relative max-w-[880px] animate-rise">
          <Link href="/compte" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
            <ArrowLeft size={15} aria-hidden />
            Mon compte
          </Link>
          <h1 className="mt-6 flex items-center gap-3 text-4xl font-medium tracking-tight sm:text-5xl">
            <Settings className="size-9 text-accent" strokeWidth={1.5} aria-hidden />
            Paramètres
          </h1>
          <p className="mt-3 text-[15px] text-muted">Gérez votre profil, votre email et votre mot de passe.</p>
        </Container>
      </section>

      <section className="theme-light py-16">
        <Container className="max-w-[880px] space-y-5">
          <SettingsForm
            action={updateName}
            title="Prénom ou pseudo"
            description="C'est le nom affiché dans votre compte et utilisé dans nos emails."
            submitLabel="Enregistrer"
          >
            <div>
              <label htmlFor="name" className={label}>Prénom ou pseudo</label>
              <input id="name" name="name" defaultValue={name} maxLength={40} autoComplete="given-name" className={field} />
            </div>
          </SettingsForm>

          <SettingsForm
            action={updateEmail}
            title="Adresse email"
            description="On enverra un lien de confirmation à la nouvelle adresse. Elle ne changera qu'après validation."
            submitLabel="Changer l'email"
          >
            <div>
              <span className={label}>Adresse actuelle</span>
              <p className="rounded-lg border border-line bg-panel-2 px-3.5 py-2.5 font-mono text-sm text-muted">{user.email}</p>
              {pendingEmail && (
                <p className="mt-2 text-sm text-muted">
                  En attente de confirmation : <span className="text-fg">{pendingEmail}</span>
                </p>
              )}
            </div>
            <div>
              <label htmlFor="email" className={label}>Nouvelle adresse</label>
              <input id="email" name="email" type="email" autoComplete="email" placeholder="vous@exemple.fr" className={field} />
            </div>
          </SettingsForm>

          <SettingsForm
            action={updatePassword}
            title="Mot de passe"
            description="Par sécurité, on vous demande d'abord votre mot de passe actuel."
            submitLabel="Changer le mot de passe"
            resetOnSuccess
          >
            <input type="email" name="username" autoComplete="username" value={user.email ?? ""} readOnly hidden />
            <div>
              <label htmlFor="current" className={label}>Mot de passe actuel</label>
              <input id="current" name="current" type="password" autoComplete="current-password" className={field} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="password" className={label}>Nouveau</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="8 caractères minimum"
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="confirm" className={label}>Confirmer</label>
                <input id="confirm" name="confirm" type="password" autoComplete="new-password" className={field} />
              </div>
            </div>
          </SettingsForm>
        </Container>
      </section>
    </>
  );
}
