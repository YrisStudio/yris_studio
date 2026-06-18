"use client";

import { useRef, useState, useEffect } from "react";
import {
  motion, AnimatePresence,
  useScroll, useTransform, useMotionValueEvent,
  useMotionValue, useSpring,
} from "framer-motion";

// ─── 3D tilt hook ─────────────────────────────────────────────────────────────

function use3DTilt(strength = 9) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-1, 1], [strength, -strength]), { stiffness: 280, damping: 32 });
  const rotY = useSpring(useTransform(mx, [-1, 1], [-strength, strength]), { stiffness: 280, damping: 32 });

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left - r.width / 2) / (r.width / 2));
    my.set((e.clientY - r.top - r.height / 2) / (r.height / 2));
  };
  const onMouseLeave = () => { mx.set(0); my.set(0); };

  return { rotX, rotY, onMouseMove, onMouseLeave };
}

// ─── Browser card (step 01) ───────────────────────────────────────────────────

type CardStyle = "minimal" | "dark" | "editorial";

function BrowserCard({ cardStyle, floatDelay = 0 }: { cardStyle: CardStyle; floatDelay?: number }) {
  const cfg = {
    dark:      { bg: "#141414", chrome: "#1c1c1c", dark: true  },
    editorial: { bg: "#f0ede8", chrome: "#e5e0d9", dark: false },
    minimal:   { bg: "#ffffff", chrome: "#f4f4f4", dark: false },
  }[cardStyle];

  return (
    <motion.div
      animate={{ y: [0, -9, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: floatDelay }}
      className="w-52 h-[138px] rounded-2xl overflow-hidden"
      style={{ background: cfg.bg }}
    >
      <div className="flex items-center gap-1.5 px-3 py-2.5" style={{ background: cfg.chrome }}>
        <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
        <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
        <div className="w-2 h-2 rounded-full bg-[#28c840]" />
        <div className="ml-2 flex-1 rounded px-2 py-[3px]" style={{ background: cfg.dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }}>
          <span className="text-[8px]" style={{ color: cfg.dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.28)" }}>yoursite.com</span>
        </div>
      </div>
      <div className="p-3 space-y-2">
        {cardStyle === "dark" && (<>
          <div className="h-3.5 rounded bg-white/85 w-3/4" />
          <div className="h-2 rounded bg-white/25 w-1/2" />
          <div className="h-10 rounded bg-white/8 mt-1" />
          <div className="h-5 rounded-full bg-white/75 w-1/3" />
        </>)}
        {cardStyle === "editorial" && (<>
          <div className="h-3.5 rounded w-4/5" style={{ background: "rgba(20,20,20,0.75)" }} />
          <div className="h-3 rounded w-2/3" style={{ background: "rgba(20,20,20,0.55)" }} />
          <div className="h-px w-full mt-1" style={{ background: "rgba(20,20,20,0.15)" }} />
          <div className="h-2 rounded w-3/5" style={{ background: "rgba(20,20,20,0.28)" }} />
          <div className="h-8 rounded mt-1" style={{ background: "rgba(20,20,20,0.07)" }} />
        </>)}
        {cardStyle === "minimal" && (<>
          <div className="h-3.5 rounded bg-black/80 w-2/3" />
          <div className="h-2 rounded bg-black/14 w-1/2" />
          <div className="h-2 rounded bg-black/09 w-3/5" />
          <div className="h-8 rounded bg-black/04 mt-1" />
          <div className="h-5 w-16 rounded-full bg-black/80" />
        </>)}
      </div>
    </motion.div>
  );
}

// ─── Visual 01: Design ────────────────────────────────────────────────────────

function DesignVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative" style={{ width: 340, height: 260 }}>
        <div className="absolute" style={{ left: 0, top: 40, transform: "rotate(-7deg)", zIndex: 1 }}>
          <BrowserCard cardStyle="editorial" floatDelay={0} />
        </div>
        <div className="absolute" style={{ right: 0, top: 20, transform: "rotate(6deg)", zIndex: 1 }}>
          <BrowserCard cardStyle="minimal" floatDelay={0.9} />
        </div>
        <div className="absolute" style={{ left: "50%", top: 0, transform: "translateX(-50%) scale(1.06)", zIndex: 2 }}>
          <BrowserCard cardStyle="dark" floatDelay={0.45} />
        </div>
      </div>
    </div>
  );
}

// ─── Visual 02: Choose ────────────────────────────────────────────────────────

function StyleTile({
  bg, name, headColor, selected,
}: {
  bg: string; name: string; headColor: string; selected?: boolean;
}) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden shrink-0"
      style={{
        width: 138,
        aspectRatio: "4/3",
        background: bg,
        opacity: selected ? 1 : 0.3,
        transform: selected ? "scale(1.1)" : "scale(0.92)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        outline: selected ? "2.5px solid #141414" : "none",
        outlineOffset: "5px",
      }}
    >
      <div className="p-3 space-y-1.5">
        <div className="rounded h-3"    style={{ background: headColor, opacity: 0.85, width: "72%" }} />
        <div className="rounded h-2"    style={{ background: headColor, opacity: 0.3,  width: "52%" }} />
        <div className="rounded h-2"    style={{ background: headColor, opacity: 0.18, width: "62%" }} />
        <div className="rounded-lg h-11 mt-2" style={{ background: headColor, opacity: bg === "#141414" ? 0.1 : 0.05 }} />
      </div>
      <div className="absolute bottom-2.5 left-3">
        <span className="text-[9px] font-bold tracking-wider uppercase" style={{ color: headColor, opacity: 0.4 }}>
          {name}
        </span>
      </div>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
          className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: bg === "#141414" ? "white" : "#141414" }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6L4.5 8.5L10 3"
              stroke={bg === "#141414" ? "#141414" : "white"}
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      )}
    </div>
  );
}

function ChooseVisual() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex items-center gap-5">
        <StyleTile bg="#f0ede8" name="Editorial" headColor="#141414" />
        <StyleTile bg="#141414" name="Bold"      headColor="#ffffff"  selected />
        <StyleTile bg="#fafafa" name="Minimal"   headColor="#141414" />
      </div>
    </div>
  );
}

// ─── Visual 03: Refine ────────────────────────────────────────────────────────

const chatMessages = [
  { from: "You",  text: "Adjust the header please" },
  { from: "Yris", text: "✓ Done, check it out!"    },
  { from: "You",  text: "More spacing here too"     },
  { from: "Yris", text: "✓ All set, looking great!" },
];

function RefineVisual() {
  const [cycle, setCycle] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    const t: ReturnType<typeof setTimeout>[] = [];
    chatMessages.forEach((_, i) => t.push(setTimeout(() => setCount(i + 1), i * 950 + 300)));
    t.push(setTimeout(() => setCycle((c) => c + 1), chatMessages.length * 950 + 1800));
    return () => t.forEach(clearTimeout);
  }, [cycle]);

  return (
    <div className="w-full h-full flex items-center justify-center px-6">
      <div className="w-full max-w-xs space-y-3">
        {chatMessages.slice(0, count).map((msg, i) => (
          <motion.div
            key={`${cycle}-${i}`}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className={`flex flex-col gap-0.5 ${msg.from === "You" ? "items-start" : "items-end"}`}
          >
            <span className="text-[10px] font-semibold text-[#141414]/32 px-1">{msg.from}</span>
            <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium max-w-[82%] ${
              msg.from === "You"
                ? "bg-[#141414]/8 text-[#141414] rounded-tl-sm"
                : "bg-[#141414] text-white rounded-tr-sm"
            }`}>
              {msg.text}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Visual 04: Ship ──────────────────────────────────────────────────────────

const shipLines = [
  { text: "$ deploy --prod",           color: "rgba(255,255,255,0.5)",  delay: 0    },
  { text: "",                           color: "",                        delay: 0.4  },
  { text: "  Compiling source...",      color: "rgba(255,255,255,0.28)", delay: 0.65 },
  { text: "✓  Build completed — 3.1s", color: "#4ade80",                delay: 1.15 },
  { text: "✓  12 functions deployed",  color: "#4ade80",                delay: 1.6  },
  { text: "✓  Edge: 24 regions",       color: "#4ade80",                delay: 2.05 },
  { text: "",                           color: "",                        delay: 2.4  },
  { text: "→  yoursite.com",           color: "rgba(255,255,255,0.88)", delay: 2.7  },
];

function ShipVisual() {
  const [cycle, setCycle] = useState(0);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    setVisible(0);
    const t: ReturnType<typeof setTimeout>[] = [];
    shipLines.forEach((line, i) => t.push(setTimeout(() => setVisible(i + 1), line.delay * 1000 + 150)));
    const last = shipLines[shipLines.length - 1];
    t.push(setTimeout(() => setCycle((c) => c + 1), last.delay * 1000 + 3000));
    return () => t.forEach(clearTimeout);
  }, [cycle]);

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="w-full max-w-sm bg-[#141414] rounded-2xl overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-3.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/75" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/75" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/75" />
          <span className="ml-2 text-white/22 text-xs font-mono">zsh</span>
        </div>
        <div className="px-5 pb-6 font-mono text-xs" style={{ lineHeight: "1.9" }}>
          {shipLines.map((line, i) =>
            i < visible ? (
              <motion.div
                key={`${cycle}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.28 }}
                style={{
                  color: line.color,
                  minHeight: line.text === "" ? "0.6rem" : undefined,
                  fontSize: line.text.startsWith("→") ? "0.8rem" : undefined,
                  fontWeight: line.text.startsWith("→") ? 600 : undefined,
                  letterSpacing: line.text.startsWith("→") ? "0.01em" : undefined,
                }}
              >
                {line.text}
              </motion.div>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Services data ────────────────────────────────────────────────────────────

const services = [
  {
    number: "01", tag: "DESIGN",
    titleLine1: "We design",
    titleHighlight: "the concepts",
    description: "Our team crafts multiple website concepts in completely different styles — giving you a rich palette of creative directions to explore.",
    Visual: DesignVisual,
  },
  {
    number: "02", tag: "CHOOSE",
    titleLine1: "You pick your",
    titleHighlight: "favorite",
    description: "Review every concept. Select the one that resonates with your vision — then tell us exactly what to keep, adjust, or reimagine.",
    Visual: ChooseVisual,
  },
  {
    number: "03", tag: "REFINE",
    titleLine1: "We iterate",
    titleHighlight: "together",
    description: "We collaborate closely, polishing every detail until the design feels exactly right. No compromises, no rushing.",
    Visual: RefineVisual,
  },
  {
    number: "04", tag: "SHIP",
    titleLine1: "We build",
    titleHighlight: "and ship",
    description: "Our engineers bring the approved design to life with clean code and peak performance. Then we launch — fast.",
    Visual: ShipVisual,
  },
];

const smooth = [0.22, 1, 0.36, 1] as const;
const sharp  = [0.55, 0, 1, 0.45] as const;

const textVariants = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0,  transition: { duration: 0.75, ease: smooth } },
  exit:    { opacity: 0, y: -30, transition: { duration: 0.32, ease: sharp  } },
};
const visualVariants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1,    transition: { duration: 0.75, ease: smooth } },
  exit:    { opacity: 0, scale: 1.02, transition: { duration: 0.32, ease: sharp  } },
};

// ─── Main section ─────────────────────────────────────────────────────────────

export default function Services() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const tilt = use3DTilt(8);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const rawIndex = useTransform(scrollYProgress, [0, 1], [0, services.length]);
  useMotionValueEvent(rawIndex, "change", (v) => {
    setActiveIndex(Math.min(services.length - 1, Math.floor(v)));
  });

  const scrollToService = (index: number) => {
    const el = containerRef.current;
    if (!el) return;
    const sectionTop = el.getBoundingClientRect().top + window.scrollY;
    const scrollable = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: sectionTop + scrollable * (index / services.length), behavior: "smooth" });
  };

  const svc = services[activeIndex];

  return (
    <section id="services" ref={containerRef} style={{ height: `${services.length * 100}vh` }}>
      <div className="sticky top-0 h-screen flex items-center relative overflow-hidden">

        {/* Main two-column layout */}
        <div className="w-full max-w-7xl mx-auto px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: text */}
          <AnimatePresence mode="wait">
            <motion.div key={activeIndex} variants={textVariants} initial="initial" animate="animate" exit="exit">
              <span className="text-[11px] font-bold tracking-[0.2em] text-[#141414]/35 uppercase mb-5 block">
                {svc.number} — {svc.tag}
              </span>

              <h2
                className="font-black tracking-tight leading-[1.02] mb-7"
                style={{ fontSize: "clamp(2.8rem, 5.5vw, 5rem)" }}
              >
                {svc.titleLine1}
                <br />
                <em className="not-italic italic bg-[#141414] text-white px-3 py-0.5 rounded-lg">
                  {svc.titleHighlight}
                </em>
              </h2>

              <p className="text-base font-medium text-[#141414]/50 max-w-xs leading-relaxed">
                {svc.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Right: visual with 3D tilt */}
          <div
            className="relative h-80 lg:h-[480px]"
            style={{ perspective: "1100px" }}
            onMouseMove={tilt.onMouseMove}
            onMouseLeave={tilt.onMouseLeave}
          >
            {/* Stable tilt wrapper — persists across AnimatePresence transitions */}
            <motion.div
              className="absolute inset-0"
              style={{ rotateX: tilt.rotX, rotateY: tilt.rotY, transformStyle: "preserve-3d" }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  variants={visualVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="absolute inset-0"
                >
                  <svc.Visual />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Step dots — far right, clickable */}
        <div className="absolute right-6 lg:right-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-10">
          {services.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToService(i)}
              className="group flex items-center justify-center w-6 h-6 cursor-pointer"
              aria-label={`Go to step ${i + 1}`}
            >
              <motion.div
                animate={{
                  height: i === activeIndex ? 28 : 8,
                  width: 8,
                  background: i === activeIndex ? "#141414" : "rgba(20,20,20,0.2)",
                }}
                whileHover={{ background: "rgba(20,20,20,0.5)" }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-full"
              />
            </button>
          ))}
        </div>

      </div>
    </section>
  );
}
