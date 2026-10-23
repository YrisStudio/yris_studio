import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type ButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "ghost";
};

export function ButtonLink({ href, children, variant = "solid" }: ButtonProps) {
  const base =
    "group inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
  const styles =
    variant === "solid"
      ? "bg-ink text-white hover:bg-ink/85"
      : "border border-line bg-white text-ink hover:bg-cloud";
  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
      <ArrowUpRight
        size={16}
        aria-hidden
        className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      />
    </Link>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-4 inline-block rounded-full bg-cloud px-3 py-1 text-xs font-medium text-muted">
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  center,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro?: string;
  center?: boolean;
}) {
  return (
    <div className={`mb-12 max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-3xl font-medium tracking-tight sm:text-5xl">{title}</h2>
      {intro && <p className="mt-4 text-lg text-muted">{intro}</p>}
    </div>
  );
}

export function Highlight({ children }: { children: React.ReactNode }) {
  return <span className="rounded-lg bg-peach px-1.5 box-decoration-clone">{children}</span>;
}

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}
