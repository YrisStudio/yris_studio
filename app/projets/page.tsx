import type { Metadata } from "next";
import { Container, SectionHeading } from "@/components/ui";
import { CtaBanner, ProjectGrid } from "@/components/sections";

export const metadata: Metadata = {
  title: "Projets",
  description: "Une sélection de sites conçus et développés par Yris Studio.",
};

export default function ProjetsPage() {
  return (
    <>
      <section className="pb-10 pt-16 sm:pt-24">
        <Container>
          <SectionHeading
            eyebrow="Projets"
            title="Des sites dont nous sommes fiers."
            intro="Chaque projet part d'une marque et d'un besoin différents. Voici quelques-uns de nos derniers sites."
          />
          <ProjectGrid />
        </Container>
      </section>
      <CtaBanner />
    </>
  );
}
