import { ButtonLink, Container, Highlight, SectionHeading } from "@/components/ui";
import { CtaBanner, PricingPlans, Process, ProjectGrid } from "@/components/sections";
import { tints, type Tint } from "@/lib/site";

const heroTiles: { tint: Tint; label: string }[] = [
  { tint: "lavender", label: "Design" },
  { tint: "mint", label: "Développement" },
  { tint: "butter", label: "Mise en ligne" },
];

export default function Home() {
  return (
    <>
      <section className="pb-16 pt-16 sm:pt-24">
        <Container>
          <div className="max-w-3xl animate-rise">
            <span className="mb-6 inline-flex items-center gap-2 text-sm text-muted">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Disponibles pour de nouveaux projets
            </span>
            <h1 className="text-5xl font-medium leading-[1.02] tracking-tight sm:text-7xl">
              Votre site, pensé avec <Highlight>soin</Highlight>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              On conçoit et on développe des sites web sur mesure, beaux et rapides, qui transforment vos visiteurs en
              clients.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/contact">Démarrer un projet</ButtonLink>
              <ButtonLink href="/projets" variant="ghost">
                Voir nos projets
              </ButtonLink>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-3 sm:gap-4" aria-hidden>
            {heroTiles.map((t, i) => (
              <div
                key={t.label}
                className="flex h-28 animate-rise items-end rounded-3xl p-4 text-sm font-medium sm:h-44 sm:p-6 sm:text-base"
                style={{ background: tints[t.tint].bg, color: tints[t.tint].ink, animationDelay: `${150 + i * 100}ms` }}
              >
                {t.label}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Process />

      <section className="py-20">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading eyebrow="Projets" title="Quelques réalisations." />
            <div className="mb-12">
              <ButtonLink href="/projets" variant="ghost">
                Tous les projets
              </ButtonLink>
            </div>
          </div>
          <ProjectGrid limit={2} />
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <SectionHeading
            center
            eyebrow="Tarifs"
            title={<>Des prix <Highlight>clairs</Highlight>, par projet.</>}
          />
          <PricingPlans />
        </Container>
      </section>

      <CtaBanner />
    </>
  );
}
