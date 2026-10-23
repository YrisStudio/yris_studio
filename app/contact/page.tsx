import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { Container, Highlight, SectionHeading } from "@/components/ui";
import ContactForm from "./ContactForm";
import { plans, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Parlez-nous de votre projet de site web. Réponse sous 24 heures.",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ formule?: string }>;
}) {
  const { formule } = await searchParams;
  const defaultPlan = plans.some((p) => p.name === formule) ? formule : undefined;

  return (
    <section className="pb-10 pt-16 sm:pt-24">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
        <div>
          <SectionHeading
            eyebrow="Contact"
            title={<>Parlons de votre <Highlight>projet</Highlight>.</>}
            intro="Quelques lignes suffisent. On vous répond sous 24 heures avec les prochaines étapes."
          />
          <div className="space-y-3 text-sm">
            <p className="text-muted">Vous préférez écrire directement ?</p>
            <a href={`mailto:${site.email}`} className="inline-flex items-center gap-1 font-medium hover:underline">
              {site.email}
              <ArrowUpRight size={14} aria-hidden />
            </a>
          </div>
        </div>
        <div className="rounded-[2rem] bg-cloud p-6 sm:p-10">
          <ContactForm defaultPlan={defaultPlan} />
        </div>
      </Container>
    </section>
  );
}
