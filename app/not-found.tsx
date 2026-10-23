import { Container, Eyebrow, SecondaryLink } from "@/components/ui";

export default function NotFound() {
  return (
    <section className="grid-bg py-32 text-center">
      <Container>
        <Eyebrow>Erreur 404</Eyebrow>
        <h1 className="mt-6 text-5xl font-medium tracking-tight sm:text-6xl">Cette page n&apos;existe pas.</h1>
        <div className="mt-10">
          <SecondaryLink href="/">Retour à l&apos;accueil</SecondaryLink>
        </div>
      </Container>
    </section>
  );
}
