import Link from "next/link";
import { CategoryGlyph, StepPrint, StepQuote, StepUpload } from "@/components/Art";
import { ScrollWords, Spotlight } from "@/components/motion";
import { Container, Eyebrow, Mono, PrimaryLink, SecondaryLink, SectionTitle } from "@/components/ui";
import { faq, materials, steps, type Product } from "@/lib/site";

// Délai d'apparition en cascade pour une liste d'éléments.
export const stagger = (i: number, step = 90) => ({ "--d": `${i * step}ms` }) as React.CSSProperties;

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  return (
    <div data-reveal style={stagger(index % 3)}>
      <Spotlight className="flex h-full flex-col p-4">
        <CategoryGlyph
          category={product.category}
          className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-[1.02]"
        />
        <Mono className="mt-5">
          {product.category} · {product.material}
        </Mono>
        <h3 className="mt-1 text-lg font-medium tracking-tight">{product.name}</h3>
        <p className="mt-2 flex-1 text-sm text-muted">{product.text}</p>
        <div className="relative mt-5 flex items-center justify-between">
          <span className="font-mono text-sm text-fg">{product.price}</span>
          <Link
            href={`/demande?type=commande&article=${product.slug}`}
            className="rounded-lg border border-line-strong bg-panel-2 px-3.5 py-1.5 text-sm transition-colors hover:border-accent hover:bg-accent hover:text-white"
          >
            Commander
          </Link>
        </div>
      </Spotlight>
    </div>
  );
}

export function MaterialsMarquee() {
  const items = [...materials.map((m) => m.name), ".stl", ".3mf", ".obj", ".step"];
  return (
    <div className="border-y border-line py-10">
      <p className="mb-7 text-center font-mono text-[11px] uppercase tracking-wider text-muted">
        Matériaux et fichiers acceptés
      </p>
      <div className="marquee overflow-hidden">
        <div className="marquee-track flex w-max">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
              {[...items, ...items].map((item, i) => (
                <span
                  key={i}
                  className={`px-10 tracking-tight text-fg/35 transition-colors hover:text-fg ${
                    item.startsWith(".") ? "font-mono text-xl" : "text-3xl font-medium"
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Manifesto() {
  return (
    <section className="theme-light py-32">
      <Container className="max-w-[900px]">
        <Mono className="mb-8 block text-accent">Notre atelier</Mono>
        <ScrollWords
          className="text-3xl font-medium leading-[1.25] tracking-tight sm:text-5xl"
          text="On imprime les pièces qu'on ne trouve plus, celles qui n'existent pas encore, et tout ce qui se trouve entre les deux. Avec une imprimante, du soin, et un peu d'obstination."
        />
      </Container>
    </section>
  );
}

const stepArt = [StepUpload, StepQuote, StepPrint];

export function HowItWorks() {
  return (
    <section id="fonctionnement" className="theme-light grid-bg border-t border-line py-28">
      <Container>
        <div data-reveal>
          <SectionTitle
            eyebrow="Comment ça marche"
            title={<>De l&apos;idée à la pièce, en 3 étapes.</>}
            intro="Vous envoyez, on chiffre, on imprime. Vous gardez la main à chaque étape."
          />
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => {
            const Art = stepArt[i];
            return (
              <li key={s.title} data-reveal style={stagger(i, 150)}>
                <Spotlight className="h-full p-6">
                  <div className="flex h-44 flex-col justify-center">
                    <Art />
                  </div>
                  <span className="mt-8 block font-mono text-[11px] uppercase tracking-wider text-accent">
                    Étape 0{i + 1}
                  </span>
                  <h3 className="mt-2 text-lg font-medium tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted">{s.text}</p>
                </Spotlight>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}

export function Materials() {
  return (
    <section id="materiaux" className="py-28">
      <Container>
        <div data-reveal>
          <SectionTitle
            eyebrow="Matériaux"
            title="Le bon matériau pour chaque pièce."
            intro="On vous conseille selon l'usage. Vous n'avez rien à choisir si vous ne savez pas."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {materials.map((m, i) => (
            <div key={m.name} data-reveal style={stagger(i)}>
              <Spotlight className="h-full p-6">
                <p className="text-5xl font-medium tracking-tight transition-colors group-hover:text-accent-2">{m.name}</p>
                <p className="mt-6 text-sm text-fg/90">{m.use}</p>
                <p className="mt-1 font-mono text-[11px] text-muted">Tient {m.heat}</p>
              </Spotlight>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function Faq() {
  return (
    <section className="theme-light py-28">
      <Container className="max-w-[760px]">
        <div data-reveal>
          <SectionTitle eyebrow="FAQ" title="Questions fréquentes." />
        </div>
        <div className="divide-y divide-line border-y border-line">
          {faq.map((item, i) => (
            <details key={item.q} className="group py-5" data-reveal style={stagger(i, 70)}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="grid size-7 shrink-0 place-items-center rounded-md border border-line text-muted transition-all duration-300 group-open:rotate-45 group-open:border-accent group-open:bg-accent group-open:text-white"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 pr-10 text-sm leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="grid-bg relative overflow-hidden py-32 text-center">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-72 max-w-3xl animate-pulse rounded-full bg-accent/25 blur-[120px] [animation-duration:5s]" />
      <Container className="relative" >
        <div data-reveal>
          <Eyebrow>Devis gratuit</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-xl text-[40px] font-medium leading-[1.05] tracking-tight sm:text-6xl">
            Une pièce en tête ?
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] text-muted">
            Envoyez-nous un fichier, une photo ou quelques mots. Réponse sous 48 heures.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <PrimaryLink href="/demande">Demander un devis</PrimaryLink>
            <SecondaryLink href="/boutique">Voir la boutique</SecondaryLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
