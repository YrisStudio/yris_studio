import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui";
import RequestForm from "./RequestForm";
import { products, requestTypes, site, type RequestType } from "@/lib/site";

export const metadata: Metadata = {
  title: "Demande",
  description: "Commandez un article, demandez une pièce sur mesure ou proposez votre projet d'impression 3D.",
};

export default async function DemandePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; article?: string }>;
}) {
  const { type, article } = await searchParams;
  const initialType = (requestTypes.find((t) => t.id === type)?.id ?? "sur-mesure") as RequestType;
  const initialArticle = products.some((p) => p.slug === article) ? article : undefined;

  return (
    <section className="grid-bg relative overflow-hidden pb-24 pt-20 sm:pt-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-80 max-w-3xl rounded-full bg-accent/10 blur-[140px]" />
      <Container className="relative max-w-[680px]">
        <div className="text-center">
          <Eyebrow>Devis gratuit</Eyebrow>
          <h1 className="mt-6 text-5xl font-medium tracking-tight sm:text-6xl">Parlons de votre pièce.</h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-muted">
            Sans engagement, réponse sous 48 heures.
          </p>
        </div>
        <div className="mt-12 rounded-2xl border border-line-strong bg-panel p-6 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)] sm:p-8">
          <RequestForm
            key={`${initialType}-${initialArticle ?? ""}`}
            initialType={initialType}
            initialArticle={initialArticle}
          />
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Un fichier trop lourd ? Écrivez-nous à{" "}
          <a href={`mailto:${site.email}`} className="text-accent-2 hover:text-white">
            {site.email}
          </a>
          .
        </p>
      </Container>
    </section>
  );
}
