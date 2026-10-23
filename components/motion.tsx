"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Observe tous les éléments [data-reveal] et leur ajoute data-visible quand ils entrent à l'écran.
// Tant que ce composant n'a pas tourné, rien n'est masqué (voir .reveal-ready dans globals.css).
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion()) return;
    root.classList.add("reveal-ready");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-visible", "");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    document.querySelectorAll("[data-reveal]:not([data-visible])").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}

function useScrollProgress<T extends HTMLElement>(compute: (rect: DOMRect, vh: number) => number) {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const still = reducedMotion();
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!ref.current) return;
      const p = still ? 1 : compute(ref.current.getBoundingClientRect(), window.innerHeight);
      setProgress(Math.min(1, Math.max(0, p)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    if (still) return () => cancelAnimationFrame(frame);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [compute]);

  return [ref, progress] as const;
}

const wordsProgress = (r: DOMRect, vh: number) => (vh * 0.85 - r.top) / (r.height + vh * 0.35);

// Phrase dont les mots s'allument un à un au fil du défilement.
export function ScrollWords({ text, className = "" }: { text: string; className?: string }) {
  const [ref, progress] = useScrollProgress<HTMLParagraphElement>(wordsProgress);
  const words = text.split(" ");
  const lit = Math.round(progress * words.length);
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <span key={i} className={`transition-colors duration-300 ${i < lit ? "text-fg" : "text-fg/15"}`}>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}

const tiltProgress = (r: DOMRect, vh: number) => (vh - r.top) / (vh * 0.9);

// Incline l'enfant en 3D, puis le redresse quand on descend.
export function TiltOnScroll({ children }: { children: React.ReactNode }) {
  const [ref, progress] = useScrollProgress<HTMLDivElement>(tiltProgress);
  const angle = 22 * (1 - progress);
  return (
    <div ref={ref} className="[perspective:1400px]">
      <div
        style={{ transform: `rotateX(${angle}deg) scale(${0.94 + 0.06 * progress})`, transformOrigin: "50% 0%" }}
        className="will-change-transform"
      >
        {children}
      </div>
    </div>
  );
}

// Compte de 0 jusqu'à la valeur quand le nombre apparaît à l'écran.
export function CountUp({ to, duration = 1400 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / duration);
        setValue(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return <span ref={ref}>{value}</span>;
}

// Carte avec un halo lumineux qui suit la souris.
export function Spotlight({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
      className={`spotlight group relative overflow-hidden rounded-2xl border border-line bg-panel transition duration-300 hover:-translate-y-1 hover:border-line-strong ${className}`}
    >
      {children}
    </div>
  );
}
