import { FileUp, Lightbulb, ShoppingBag } from "lucide-react";
import { CarPartCard, QuoteDashboard } from "@/components/Art";
import { CountUp, Spotlight, TiltOnScroll } from "@/components/motion";
import { Faq, FinalCta, HowItWorks, Manifesto, Materials, MaterialsMarquee, stagger } from "@/components/sections";
import { Container, Eyebrow, Mono, PrimaryLink, SecondaryLink, SectionTitle, TextLink } from "@/components/ui";
import { materials } from "@/lib/site";

const title = "Vos idées. Imprimées.".split(" ");

const starts = [
  { icon: FileUp, title: "Sur mesure", text: "Un fichier STL, une photo ou des mesures. On s'occupe du reste.", href: "/demande?type=sur-mesure", cta: "Envoyer" },
  { icon: Lightbulb, title: "Votre projet", text: "Prototype, petite série, idée à concrétiser. Parlons-en.", href: "/demande?type=projet", cta: "Proposer" },
  { icon: ShoppingBag, title: "Boutique", text: "Des articles prêts à imprimer, en quelques clics.", href: "/boutique", cta: "Parcourir" },
];

export default function Home() {
  return (
    <>
      {/* Hero, noir */}
      <section className="grid-bg relative overflow-hidden pt-20 sm:pt-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[420px] max-w-4xl animate-pulse rounded-full bg-accent/10 blur-[140px] [animation-duration:6s]" />
        <Container className="relative text-center">
          <div className="animate-rise">
            <Eyebrow>
              <span className="mr-2 inline-block size-1.5 animate-pulse-dot rounded-full bg-emerald-400 align-middle" />
              Impression 3D à la demande
            </Eyebrow>
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-medium leading-[1.05] tracking-tight sm:text-7xl">
            {title.map((w, i) => (
              <span
                key={i}
                className={`inline-block animate-rise ${i === 2 ? "bg-gradient-to-r from-accent-2 to-accent bg-clip-text text-transparent" : ""}`}
                style={{ animationDelay: `${120 + i * 110}ms` }}
              >
                {w}&nbsp;
              </span>
            ))}
          </h1>
          <div className="animate-rise [animation-delay:500ms]">
            <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-muted sm:text-base">
              Pièces auto, objets du quotidien, prototypes. Commandez, demandez une pièce ou proposez votre projet.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <PrimaryLink href="/demande">Demander un devis</PrimaryLink>
              <SecondaryLink href="/boutique">Voir la boutique</SecondaryLink>
            </div>
          </div>

          <div className="relative mt-16 animate-rise [animation-delay:700ms] sm:mt-20">
            <TiltOnScroll>
              <QuoteDashboard />
            </TiltOnScroll>
            {/* Fondu vers le bas, comme le dashboard qui s'efface dans la page. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg via-bg/70 to-transparent" />
          </div>
        </Container>
      </section>

      <MaterialsMarquee />

      {/* Blanc */}
      <Manifesto />
      <HowItWorks />

      {/* Noir : pièces auto */}
      <section className="relative overflow-hidden py-28">
        <div className="pointer-events-none absolute -right-40 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-accent/15 blur-[120px]" />
        <Container className="relative grid items-center gap-16 md:grid-cols-2">
          <div data-reveal>
            <Eyebrow>Pièces auto</Eyebrow>
            <h2 className="mt-5 text-[34px] font-medium leading-[1.1] tracking-tight sm:text-5xl">
              La pièce introuvable, recréée.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
              Clips, caches, boutons, supports. Reproduits d&apos;après votre pièce cassée, en ABS ou ASA résistants à la
              chaleur de l&apos;habitacle.
            </p>
            <div className="mt-8">
              <PrimaryLink href="/demande?type=sur-mesure">Demander une pièce auto</PrimaryLink>
            </div>
          </div>
          <div data-reveal style={stagger(2, 100)} className="grid-bg rounded-2xl border border-line bg-panel px-8 py-14">
            <CarPartCard />
          </div>
        </Container>
      </section>

      {/* Blanc : bento */}
      <section className="theme-light py-28">
        <Container>
          <div data-reveal>
            <SectionTitle eyebrow="Trois façons de commencer" title="Tout ce qu'il vous faut pour imprimer." />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {starts.map((t, i) => (
              <div key={t.title} data-reveal style={stagger(i)}>
                <Spotlight className="h-full p-6">
                  <span className="grid size-10 place-items-center rounded-lg border border-line bg-panel-2 transition-all duration-300 group-hover:rotate-6 group-hover:scale-110 group-hover:border-accent">
                    <t.icon size={18} className="text-accent" aria-hidden />
                  </span>
                  <h3 className="mt-6 text-lg font-medium tracking-tight">{t.title}</h3>
                  <p className="mt-2 text-sm text-muted">{t.text}</p>
                  <div className="relative mt-5">
                    <TextLink href={t.href}>{t.cta}</TextLink>
                  </div>
                </Spotlight>
              </div>
            ))}

            <div data-reveal style={stagger(3)}>
              <div className="flex h-full flex-col justify-between rounded-2xl bg-[#0a0a0b] p-6 text-white">
                <Mono className="text-white/50">Devis</Mono>
                <p className="mt-6 text-7xl font-medium tracking-tight">
                  <CountUp to={48} />
                  <span className="text-accent"> h</span>
                </p>
                <p className="mt-2 text-sm text-white/60">pour recevoir votre devis gratuit.</p>
              </div>
            </div>

            <div data-reveal style={stagger(4)} className="md:col-span-2">
              <Spotlight className="h-full p-6">
                <Mono>Matériaux</Mono>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {materials.map((m) => (
                    <div
                      key={m.name}
                      className="rounded-lg border border-line bg-panel-2 p-3 transition-all duration-300 hover:-translate-y-1 hover:border-accent"
                    >
                      <p className="text-xl font-medium">{m.name}</p>
                      <p className="mt-1 font-mono text-[10px] text-muted">{m.heat}</p>
                    </div>
                  ))}
                </div>
                <div className="relative mt-5">
                  <TextLink href="/#materiaux">Lequel choisir</TextLink>
                </div>
              </Spotlight>
            </div>
          </div>
        </Container>
      </section>

      {/* Noir */}
      <Materials />
      {/* Blanc */}
      <Faq />
      {/* Noir */}
      <FinalCta />
    </>
  );
}
