import Link from "next/link";
import { Check } from "lucide-react";
import { ButtonLink, Container, Highlight, SectionHeading } from "@/components/ui";
import { plans, projects, steps, tints, type Plan } from "@/lib/site";

export function Process() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          eyebrow="Notre méthode"
          title={<>Quatre étapes, <Highlight>zéro surprise</Highlight>.</>}
          intro="Un process simple et transparent, où vous gardez la main à chaque étape."
        />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col rounded-3xl p-6"
              style={{ background: tints[step.tint].bg, color: tints[step.tint].ink }}
            >
              <span className="mb-10 text-sm font-medium">0{i + 1}</span>
              <h3 className="text-xl font-medium tracking-tight">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed opacity-80">{step.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

export function ProjectCard({ project }: { project: (typeof projects)[number] }) {
  const tint = tints[project.tint];
  const domain = project.name.toLowerCase().replace(/\s+/g, "") + ".com";
  return (
    <article className="group">
      <div
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl"
        style={{ background: tint.bg }}
      >
        <div className="w-[64%] overflow-hidden rounded-2xl bg-white/90 transition-transform duration-500 group-hover:-translate-y-1.5 group-hover:scale-[1.02]">
          <div className="flex items-center gap-1.5 bg-white/60 px-3 py-2">
            {[0.6, 0.4, 0.25].map((o) => (
              <span key={o} className="size-2 rounded-full" style={{ background: tint.ink, opacity: o }} />
            ))}
            <span className="ml-2 flex-1 truncate rounded bg-black/5 px-2 py-0.5 text-[10px] text-black/40">
              {domain}
            </span>
          </div>
          <div className="space-y-2 p-4">
            <div className="h-4 rounded-md" style={{ background: tint.ink, opacity: 0.8 }} />
            <div className="h-2.5 w-4/5 rounded bg-black/10" />
            <div className="h-2.5 w-3/5 rounded bg-black/5" />
            <div className="mt-3 h-14 rounded-xl" style={{ background: tint.bg }} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="font-medium">{project.name}</h3>
        <p className="text-sm text-muted">{project.category}</p>
      </div>
    </article>
  );
}

export function ProjectGrid({ limit }: { limit?: number }) {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2">
      {projects.slice(0, limit).map((p) => (
        <ProjectCard key={p.name} project={p} />
      ))}
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={`relative flex flex-col rounded-3xl p-7 ${
        plan.featured ? "bg-ink text-white" : "border border-line bg-white"
      }`}
    >
      {plan.featured && (
        <span className="absolute -top-3 left-7 rounded-full bg-peach px-3 py-1 text-xs font-medium text-peach-ink">
          Le plus choisi
        </span>
      )}
      <h3 className="text-lg font-medium">{plan.name}</h3>
      <p className={`mt-1 text-sm ${plan.featured ? "text-white/60" : "text-muted"}`}>{plan.pitch}</p>
      <p className="mt-6 flex items-baseline gap-1.5">
        <span className="text-4xl font-medium tracking-tight">{plan.price}</span>
        <span className={`text-sm ${plan.featured ? "text-white/60" : "text-muted"}`}>/ projet</span>
      </p>
      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <Check size={16} aria-hidden className={`mt-0.5 shrink-0 ${plan.featured ? "text-mint" : "text-mint-ink"}`} />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={`/contact?formule=${encodeURIComponent(plan.name)}`}
        className={`mt-8 inline-flex w-full justify-center rounded-full px-6 py-3.5 text-sm font-medium transition-colors ${
          plan.featured ? "bg-white text-ink hover:bg-white/85" : "border border-line hover:bg-cloud"
        }`}
      >
        Choisir {plan.name}
      </Link>
    </div>
  );
}

export function PricingPlans() {
  return (
    <div className="grid gap-6 pt-3 md:grid-cols-3">
      {plans.map((plan) => (
        <PlanCard key={plan.name} plan={plan} />
      ))}
    </div>
  );
}

export function CtaBanner() {
  return (
    <section className="py-20">
      <Container>
        <div className="flex flex-col items-start gap-6 rounded-[2rem] bg-lavender px-8 py-14 text-lavender-ink sm:px-14 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">Un projet en tête ?</h2>
            <p className="mt-2 max-w-md opacity-80">
              Racontez-le nous en quelques lignes, on vous répond sous 24 heures.
            </p>
          </div>
          <ButtonLink href="/contact">Démarrer un projet</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
