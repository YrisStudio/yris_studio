import type { Metadata } from "next";
import { Container, Highlight, SectionHeading } from "@/components/ui";
import { CtaBanner, PricingPlans } from "@/components/sections";
import { faq } from "@/lib/site";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "Trois formules claires pour créer votre site web sur mesure avec Yris Studio.",
};

export default function TarifsPage() {
  return (
    <>
      <section className="pb-10 pt-16 sm:pt-24">
        <Container>
          <SectionHeading
            center
            eyebrow="Tarifs"
            title={<>Simple et <Highlight>transparent</Highlight>.</>}
            intro="Un prix fixe par projet, sans abonnement caché. Choisissez la formule qui vous ressemble."
          />
          <PricingPlans />
        </Container>
      </section>

      <section className="py-20">
        <Container className="max-w-3xl">
          <h2 className="mb-8 text-3xl font-medium tracking-tight">Questions fréquentes</h2>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    aria-hidden
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-cloud text-lg transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 pr-10 text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <CtaBanner />
    </>
  );
}
