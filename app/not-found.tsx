import { ButtonLink, Container } from "@/components/ui";

export default function NotFound() {
  return (
    <section className="py-32">
      <Container className="text-center">
        <p className="text-sm text-muted">Erreur 404</p>
        <h1 className="mt-3 text-4xl font-medium tracking-tight sm:text-6xl">Cette page n&apos;existe pas.</h1>
        <div className="mt-10">
          <ButtonLink href="/">Retour à l&apos;accueil</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
